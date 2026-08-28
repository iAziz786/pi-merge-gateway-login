/**
 * Model definitions for the Merge Dev gateway provider.
 *
 * Extracted so the model config (including compat flags) is unit-testable.
 */

import { GLM_53_FLASH_COST } from "./pricing.ts";

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

export const GLM_53_FLASH_MODEL = {
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
		// Z.AI uses automatic caching. The gateway groups requests by
		// X-Session-Id header to reuse cached prefixes. "openrouter" sends
		// x-session-id (HTTP headers are case-insensitive).
		sessionAffinityFormat: "openrouter",
	},
} as const;
