/**
 * Merge Dev gateway provider (https://docs.merge.dev/merge-gateway/)
 *
 * OpenAI Responses API (via Merge Dev gateway):
 *   baseUrl: https://api-gateway.merge.dev/v1/openai
 *   endpoint: /responses (→ https://api-gateway.merge.dev/v1/openai/responses)
 *   auth:    Bearer <key>  (stored via `/login merge-gateway`, or $MERGE_GATEWAY_API_KEY)
 *            When the env var is set it takes precedence for that process;
 *            unset it (and remove any models.yml apiKey override) to use the
 *            stored `/login` credential.
 *
 * We use /v1/openai (not /v1) so OpenAI-only fields like prompt_cache_key and
 * prompt_cache_retention are properly forwarded to the upstream provider rather
 * than being silently ignored on the native /v1/responses endpoint.
 *
 * Model list: the gateway's own catalog (`GET /v1/models`) — every chat-capable
 * model it serves, under the gateway's ids, with the rates of the vendor the
 * gateway prefers for it. The four models in models.ts are the offline fallback
 * when no key is available or the catalog cannot be reached.
 *
 * Pricing: the gateway routes each request to the cheapest eligible vendor and
 * fails over, so one card per model cannot stay right. `after_provider_response`
 * fires before the response stream is consumed — and therefore before pi prices
 * the usage — so the hook below rewrites the model's rates from the response's
 * `x-merge-vendor` header, peak windows included (see catalog.ts).
 *
 * Requests are not pinned to a vendor: pi/omp side requests (session titles,
 * compaction summarization, handoff) never run extension hooks, so an id the
 * gateway does not know — or a field only the hook could add — would break them.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { ALL_MODELS } from "./models.ts";
import { loginMergeGateway } from "./login.ts";
import {
	chatModels,
	fetchCatalog,
	indexCatalog,
	preferredVendor,
	ratesFor,
	resolveModel,
	toModelEntry,
	type CatalogIndex,
	type ModelEntry,
	type VendorRates,
} from "./catalog.ts";

const BASE_URL = "https://api-gateway.merge.dev/v1/openai";
/** Budget for the catalog fetch; a slow gateway must not hold up session start. */
const CATALOG_TIMEOUT_MS = 4_000;

/** Every model id this provider serves; the catalog widens it past the fallback. */
const GATEWAY_MODEL_IDS = new Set<string>(ALL_MODELS.map((model) => model.id));

interface CatalogLoad {
	entries: ModelEntry[];
	index: CatalogIndex;
}

/**
 * Adds `prompt_cache_key` from the pi session ID so the gateway keeps a session
 * on the host whose prompt cache is warm and namespaces its provider cache key.
 * The gateway ignores the `x-session-id` header on this surface and respects the
 * body key, which is what fixes cache affinity for image sessions.
 *
 * Returns undefined to leave the request untouched: other providers' models,
 * malformed payloads, requests that already carry a key, or no session id.
 *
 * Exported for unit testing.
 */
export function resolveGatewayRequest(
	payload: unknown,
	sessionId?: unknown,
): Record<string, unknown> | undefined {
	if (!payload || typeof payload !== "object") return undefined;
	const p = payload as Record<string, unknown>;
	const piModelId = p.model;
	if (typeof piModelId !== "string" || !GATEWAY_MODEL_IDS.has(piModelId)) return undefined;
	const sessionKey = typeof sessionId === "string" && sessionId.length > 0 ? sessionId : undefined;
	if (!sessionKey) return undefined;
	if (typeof p.prompt_cache_key === "string" && p.prompt_cache_key.length > 0) return undefined;
	return { ...p, prompt_cache_key: sessionKey };
}

/**
 * Reprice the current model at the vendor that served the response, so pi bills
 * the turn the way the gateway does. Falls back to the catalog's alias table for
 * ids the gateway resolves elsewhere (the retired `deepseek-v4-flash` bills as
 * V4.1 Flash). Returns false when the vendor is unknown, leaving the card alone.
 *
 * Exported for unit testing.
 */
export function priceTurnAtVendor(
	model: { id: string; cost: VendorRates },
	vendor: string | undefined,
	index: CatalogIndex,
	atMs: number,
): boolean {
	if (!vendor) return false;
	const byVendor = (candidate: { vendors: { vendor: string }[] } | undefined) =>
		candidate?.vendors.find((entry) => entry.vendor === vendor);
	const entry = byVendor(resolveModel(index, model.id)) ?? byVendor(index.byAlias.get(model.id));
	if (!entry) return false;
	const rates = ratesFor(entry as Parameters<typeof ratesFor>[0], atMs);
	model.cost.input = rates.input;
	model.cost.output = rates.output;
	model.cost.cacheRead = rates.cacheRead;
	model.cost.cacheWrite = rates.cacheWrite;
	return true;
}

/**
 * Fetch the catalog and turn it into pi model entries. Returns undefined when
 * the gateway is unreachable or serves nothing usable, which keeps the static
 * four models registered instead.
 */
async function loadCatalog(apiKey: string, fetchImpl: typeof fetch): Promise<CatalogLoad | undefined> {
	try {
		const models = await fetchCatalog(apiKey, (input, init) =>
			fetchImpl(input, { ...init, signal: AbortSignal.timeout(CATALOG_TIMEOUT_MS) }),
		);
		const entries: ModelEntry[] = [];
		for (const model of chatModels(models)) {
			const vendor = preferredVendor(model);
			if (vendor) entries.push(toModelEntry(model, vendor));
		}
		if (entries.length === 0) return undefined;
		for (const entry of entries) GATEWAY_MODEL_IDS.add(entry.id);
		return { entries, index: indexCatalog(models) };
	} catch {
		return undefined;
	}
}

export default async function registerMergeGateway(
	pi: ExtensionAPI,
	deps: { fetch?: typeof fetch } = {},
): Promise<void> {
	const apiKey = process.env.MERGE_GATEWAY_API_KEY;
	const catalog = apiKey ? await loadCatalog(apiKey, deps.fetch ?? fetch) : undefined;

	pi.registerProvider("merge-gateway", {
		name: "Merge Dev",
		baseUrl: BASE_URL,
		apiKey: "MERGE_GATEWAY_API_KEY",
		api: "openai-responses",
		models: catalog?.entries ?? [...ALL_MODELS],
		oauth: {
			name: "Merge Dev",
			login: loginMergeGateway,
		},
	});

	// Forward the pi session ID as prompt_cache_key (the gateway ignores the
	// x-session-id header, respects the body key; fixes image-session routing).
	// Model ids and vendor selection are left to the gateway.
	pi.on("before_provider_request", (event, ctx) =>
		resolveGatewayRequest(event.payload, ctx?.sessionManager?.getSessionId()),
	);

	// Price each turn at the vendor that served it — see priceTurnAtVendor.
	if (catalog) {
		const { index } = catalog;
		pi.on("after_provider_response", (event, ctx) => {
			const model = ctx?.model;
			if (!model || model.provider !== "merge-gateway") return;
			priceTurnAtVendor(model, event.headers["x-merge-vendor"], index, Date.now());
		});
	}
}
