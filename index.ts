/**
 * Merge Dev gateway provider (https://docs.merge.dev/merge-gateway/)
 *
 * OpenAI Responses API (via Merge Dev gateway):
 *   baseUrl: https://api-gateway.merge.dev/v1/openai
 *   endpoint: /responses (→ https://api-gateway.merge.dev/v1/openai/responses)
 *   auth:    Bearer <key>  (stored via `/login mergedev`, or $MERGE_GATEWAY_API_KEY)
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
import { GLM_53_FLASH_VENDOR } from "./pricing.ts";
import { GLM_53_FLASH_MODEL } from "./models.ts";
import { pinVendor } from "./routing.ts";

const MODEL_ID = "zai/glm-5.3-flash";
const BASE_URL = "https://api-gateway.merge.dev/v1/openai";

export default function (pi: ExtensionAPI) {
	pi.registerProvider("mergedev", {
		name: "Merge Dev",
		baseUrl: BASE_URL,
		apiKey: "$MERGE_GATEWAY_API_KEY",
		api: "openai-responses",
		models: [GLM_53_FLASH_MODEL],
	});

	// Pin the routing vendor so the gateway always serves Particle and the
	// baked-in Particle rates (used by pi to compute cost) stay exact. pi never
	// surfaces the gateway's response `vendor`/`usage.cost`, so we can't correct
	// cost after the fact — forcing the host at request time is the reliable fix.
	pi.on("before_provider_request", (event) => {
		const payload = event.payload as Record<string, unknown> | undefined;
		if (!payload || typeof payload !== "object") return;
		return pinVendor(payload, GLM_53_FLASH_VENDOR, MODEL_ID);
	});
}
