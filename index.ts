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
 * Hosts the models Merge Gateway serves this account (GLM 5.3 Flash, DeepSeek
 * V4 Flash, DeepSeek V4 Flash 0731, DeepSeek V4.1 Flash) as registered in
 * models.ts, under the gateway's own model ids. Requests are not pinned to a
 * vendor: pi/omp side requests (session titles, compaction summarization,
 * handoff) never run this extension's hook, so an id the gateway does not know
 * — or a field only the hook could add — would break them. The gateway picks
 * the cheapest eligible vendor and each model entry carries that vendor's rates
 * (see pricing.ts).
 *
 * GLM accepts reasoning effort low / high / max; pi's middle levels fold
 * into those. DeepSeek models take the full none…max ladder.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { ALL_MODELS } from "./models.ts";
import { loginMergeGateway } from "./login.ts";

const BASE_URL = "https://api-gateway.merge.dev/v1/openai";
/** Model ids this provider serves, so the hook ignores every other provider. */
const GATEWAY_MODEL_IDS: Record<string, true> = Object.fromEntries(ALL_MODELS.map((m) => [m.id, true]));
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
	if (typeof piModelId !== "string" || GATEWAY_MODEL_IDS[piModelId] !== true) return undefined;
	const sessionKey = typeof sessionId === "string" && sessionId.length > 0 ? sessionId : undefined;
	if (!sessionKey) return undefined;
	if (typeof p.prompt_cache_key === "string" && p.prompt_cache_key.length > 0) return undefined;
	return { ...p, prompt_cache_key: sessionKey };
}

export default function (pi: ExtensionAPI) {
	pi.registerProvider("merge-gateway", {
		name: "Merge Dev",
		baseUrl: BASE_URL,
		apiKey: "MERGE_GATEWAY_API_KEY",
		api: "openai-responses",
		models: [...ALL_MODELS],
		oauth: {
			name: "Merge Dev",
			login: loginMergeGateway,
		},
	});

	// Forward the pi session ID as prompt_cache_key (the gateway ignores the
	// x-session-id header, respects the body key; fixes image-session routing).
	// Model ids and host selection are left to the gateway.
	pi.on("before_provider_request", (event, ctx) =>
		resolveGatewayRequest(event.payload, ctx?.sessionManager?.getSessionId()),
	);
}
