/**
 * Model definitions for the Merge Dev gateway provider.
 *
 * Extracted so the model config (including compat flags) is unit-testable.
 */

import { GLM_53_FLASH_COST, DEEPSEEK_V4_FLASH_COSTS } from "./pricing.ts";

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

const GLM_53_FLASH_BASE = {
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

// Both pi model IDs point to the same gateway model zai/glm-5.3-flash.
// The vendor field in the request body selects the execution host.
export const ZAI_GLM_53_FLASH = { ...GLM_53_FLASH_BASE, id: "zai/glm-5.3-flash" } as const;
export const PARTICLE_GLM_53_FLASH = { ...GLM_53_FLASH_BASE, id: "particle/glm-5.3-flash" } as const;

// DeepSeek models take the full effort ladder (none / minimal / low / medium /
// high / xhigh / max) on every vendor route the gateway exposes; read
// reasoning.effort_values from GET /v1/models.
const DEEPSEEK_EFFORT_MAP = {
	off: "none",
	minimal: "minimal",
	low: "low",
	medium: "medium",
	high: "high",
	xhigh: "xhigh",
	max: "max",
} as const;

const DEEPSEEK_V4_FLASH_BASE = {
	name: "DeepSeek V4 Flash",
	reasoning: true,
	input: ["text"],
	contextWindow: 1_048_576,
	maxTokens: 384_000,
	compat: {
		thinkingFormat: "openai",
		supportsReasoningEffort: true,
		sessionAffinityFormat: "openrouter",
	},
} as const;

export const DEEPSEEK_V4_FLASH_MODELS = [
	{
		...DEEPSEEK_V4_FLASH_BASE,
		id: "deepseek/deepseek-v4-flash",
		cost: { ...DEEPSEEK_V4_FLASH_COSTS.deepseek },
		thinkingLevelMap: DEEPSEEK_EFFORT_MAP,
	},
	{
		...DEEPSEEK_V4_FLASH_BASE,
		id: "particle/deepseek-v4-flash",
		cost: { ...DEEPSEEK_V4_FLASH_COSTS.particle },
		thinkingLevelMap: DEEPSEEK_EFFORT_MAP,
	},
] as const;

export const ALL_MODELS = [
	ZAI_GLM_53_FLASH,
	PARTICLE_GLM_53_FLASH,
	...DEEPSEEK_V4_FLASH_MODELS,
] as const;
