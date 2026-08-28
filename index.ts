/**
 * Merge Dev gateway provider (https://docs.merge.dev/merge-gateway/)
 *
 * OpenAI Responses API:
 *   baseUrl: https://api-gateway.merge.dev/v1
 *   endpoint: /responses
 *   auth:    Bearer <key>  (stored via `/login mergedev`, or $MERGE_GATEWAY_API_KEY)
 *
 * Hosts a single model: GLM 5.3 Flash (zai/glm-5.3-flash).
 * Pricing from https://docs.merge.dev/merge-gateway/models/details/zai-glm-5-3-flash
 * (vendor: ${GLM_53_FLASH_VENDOR}).
 *
 * The gateway exposes the OpenAI Responses contract, so requests stay on the
 * Responses API shape (no chat-completions fields). GLM accepts reasoning
 * effort low / high / max; pi's middle levels fold into those.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { GLM_53_FLASH_COST, GLM_53_FLASH_VENDOR } from "./pricing.ts";
import { pinVendor } from "./routing.ts";

const MODEL_ID = "zai/glm-5.3-flash";

const BASE_URL = "https://api-gateway.merge.dev/v1";

// Map pi thinking levels to the upstream reasoning effort values
// (low / high / max). `off: null` disables reasoning when selected.
const THINKING_LEVEL_MAP = {
	off: null,
	minimal: "low",
	low: "low",
	medium: "high",
	high: "high",
	xhigh: "max",
	max: "max",
} as const;

export default function (pi: ExtensionAPI) {
	pi.registerProvider("mergedev", {
		name: "Merge Dev",
		baseUrl: BASE_URL,
		apiKey: "$MERGE_GATEWAY_API_KEY",
		api: "openai-responses",
		// pi's openai-responses provider sends the OpenAI Responses wire format, but
		// the gateway's /v1/responses endpoint is its native format. This header
		// tells the gateway to accept (and return) the OpenAI shape.
		headers: { "X-Merge-Wire-Format": "openai" },
		models: [
			{
				id: "zai/glm-5.3-flash",
				name: "GLM 5.3 Flash",
				reasoning: true,
				input: ["text", "image"],
				cost: { ...GLM_53_FLASH_COST },
				contextWindow: 1_000_000,
				maxTokens: 131072,
				thinkingLevelMap: THINKING_LEVEL_MAP,
				compat: {
					thinkingFormat: "openai",
					supportsReasoningEffort: true,
				},
			},
		],
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
