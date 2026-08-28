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
 *
 * The gateway exposes the OpenAI Responses contract, so requests stay on the
 * Responses API shape (no chat-completions fields). GLM accepts reasoning
 * effort low / high / max; pi's middle levels fold into those.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { GLM_53_FLASH_COST } from "./pricing.ts";

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
}
