/**
 * Model definitions for the Merge Dev gateway provider.
 *
 * Extracted so the model config (including compat flags) is unit-testable.
 */

import {
	GLM_53_FLASH_COST,
	DEEPSEEK_V4_FLASH_COSTS,
	DEEPSEEK_V4_1_FLASH_COSTS,
	DEEPSEEK_V4_FLASH_0731_COST,
	GATEWAY_ROUTED_COSTS,
} from "./pricing.ts";

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

// DeepSeek V4 Flash 0731: the July 31 snapshot of the same gateway model.
// Single vendor (Particle) on this provider, same route limits and modalities.
export const PARTICLE_DEEPSEEK_V4_FLASH_0731 = {
	...DEEPSEEK_V4_FLASH_BASE,
	id: "particle/deepseek-v4-flash-0731",
	name: "DeepSeek V4 Flash 0731",
	cost: { ...DEEPSEEK_V4_FLASH_0731_COST },
	thinkingLevelMap: DEEPSEEK_EFFORT_MAP,
} as const;

// DeepSeek V4.1 Flash: one gateway model (deepseek/deepseek-v4.1-flash), two
// vendors registered here. Both routes take image input and the full ladder.
const DEEPSEEK_V4_1_FLASH_BASE = {
	name: "DeepSeek V4.1 Flash",
	reasoning: true,
	input: ["text", "image"],
	contextWindow: 1_000_000,
	maxTokens: 384_000,
	compat: {
		thinkingFormat: "openai",
		supportsReasoningEffort: true,
		sessionAffinityFormat: "openrouter",
	},
} as const;

export const PARTICLE_DEEPSEEK_V4_1_FLASH = {
	...DEEPSEEK_V4_1_FLASH_BASE,
	id: "particle/deepseek-v4.1-flash",
	cost: { ...DEEPSEEK_V4_1_FLASH_COSTS.particle },
	thinkingLevelMap: DEEPSEEK_EFFORT_MAP,
} as const;

export const FIREWORKS_DEEPSEEK_V4_1_FLASH = {
	...DEEPSEEK_V4_1_FLASH_BASE,
	id: "fireworks/deepseek-v4.1-flash",
	cost: { ...DEEPSEEK_V4_1_FLASH_COSTS.fireworks },
	thinkingLevelMap: DEEPSEEK_EFFORT_MAP,
} as const;

// Gateway-routed entries: the canonical gateway model ids, left unpinned so the
// gateway picks the host. pi and omp run internal side requests (title
// generation, compaction summarization, handoff) without extension request
// hooks, so only ids that need no rewrite work there; the vendor-prefixed ids
// above are rewritten by the before_provider_request hook, which those side
// requests never call. Costs are the default host's rates.
export const GATEWAY_ROUTED_MODELS = [
	{
		...DEEPSEEK_V4_1_FLASH_BASE,
		id: "deepseek/deepseek-v4.1-flash",
		name: "DeepSeek V4.1 Flash (gateway routing)",
		cost: { ...GATEWAY_ROUTED_COSTS["deepseek/deepseek-v4.1-flash"] },
		thinkingLevelMap: DEEPSEEK_EFFORT_MAP,
	},
	{
		...DEEPSEEK_V4_FLASH_BASE,
		id: "deepseek/deepseek-v4-flash-0731",
		name: "DeepSeek V4 Flash 0731 (gateway routing)",
		cost: { ...GATEWAY_ROUTED_COSTS["deepseek/deepseek-v4-flash-0731"] },
		thinkingLevelMap: DEEPSEEK_EFFORT_MAP,
	},
] as const;

export const ALL_MODELS = [
	ZAI_GLM_53_FLASH,
	PARTICLE_GLM_53_FLASH,
	...DEEPSEEK_V4_FLASH_MODELS,
	PARTICLE_DEEPSEEK_V4_1_FLASH,
	FIREWORKS_DEEPSEEK_V4_1_FLASH,
	PARTICLE_DEEPSEEK_V4_FLASH_0731,
	...GATEWAY_ROUTED_MODELS,
] as const;
