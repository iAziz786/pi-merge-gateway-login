/**
 * Merge Dev gateway provider (https://docs.merge.dev/merge-gateway/)
 *
 * OpenAI Responses API (via Merge Dev gateway):
 *   baseUrl: https://api-gateway.merge.dev/v1/openai
 *   endpoint: /responses (→ https://api-gateway.merge.dev/v1/openai/responses)
 *   auth:    Bearer <key>  (stored via `/login merge-gateway`, or $MERGE_GATEWAY_API_KEY)
 *
 * We use /v1/openai (not /v1) so OpenAI-only fields like prompt_cache_key and
 * prompt_cache_retention are properly forwarded to the upstream provider rather
 * than being silently ignored on the native /v1/responses endpoint.
 *
 * Hosts a single model: GLM 5.3 Flash (zai/glm-5.3-flash).
 * Pricing from https://docs.merge.dev/merge-gateway/models/details/zai-glm-5-3-flash
 * (vendor: ${GLM_53_FLASH_VENDOR}).
 *
 * GLM accepts reasoning effort low / high / max; pi's middle levels fold
 * into those.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { ALL_MODELS } from "./models.ts";
import { resolveVendorAndModel } from "./routing.ts";

const BASE_URL = "https://api-gateway.merge.dev/v1/openai";

/**
 * Rewrites the outgoing request for the Merge Dev gateway: resolves the vendor
 * and overwrites `model` with the real gateway model ID. For `particle` vendor
 * only, injects `prompt_cache_key` from the pi session ID when the payload
 * has none (gateway ignores `x-session-id` header, respects body key).
 * Returns undefined to leave the request untouched (unrelated providers,
 * malformed payloads, or models not in VENDOR_MAP).
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
	if (typeof piModelId !== "string") return undefined;
	const resolved = resolveVendorAndModel(p, piModelId);
	if (!resolved) return undefined;
	const out: Record<string, unknown> = { ...resolved.payload, vendor: resolved.vendor };
	if (
		resolved.vendor === "particle" &&
		typeof sessionId === "string" &&
		sessionId.length > 0 &&
		(typeof out.prompt_cache_key !== "string" || out.prompt_cache_key.length === 0)
	) {
		out.prompt_cache_key = sessionId;
	}
	return out;
}

export default function (pi: ExtensionAPI) {
	pi.registerProvider("merge-gateway", {
		name: "Merge Dev",
		baseUrl: BASE_URL,
		apiKey: "$MERGE_GATEWAY_API_KEY",
		api: "openai-responses",
		models: [...ALL_MODELS],
	});

	// Resolve vendor and rewrite gateway model ID at request time.
	// Vendor-prefixed pi model IDs (particle/…) map to the same gateway model;
	// the vendor field selects the execution host so cost display matches billing.
	// Particle-only: forward pi session ID as prompt_cache_key (gateway ignores
	// x-session-id header, respects body key; fixes image-session routing).
	pi.on("before_provider_request", (event, ctx) =>
		resolveGatewayRequest(event.payload, ctx?.sessionManager?.getSessionId()),
	);
}
