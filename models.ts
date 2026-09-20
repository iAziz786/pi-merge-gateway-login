/**
 * Bundled fallback models for the Merge Dev gateway provider.
 *
 * The extension registers the gateway's live catalog (`GET /v1/models`) when it
 * can reach it; these four are what remains when no API key is available at
 * startup or the catalog fetch fails. One entry per gateway model, using the
 * gateway's own model id: requests are left unpinned and the gateway picks the
 * vendor. Ids stay wire-valid everywhere, including pi/omp side requests
 * (session titles, compaction summarization, handoff), which never run the
 * `before_provider_request` hook and therefore cannot have a rewritten id or a
 * vendor pin applied.
 *
 * Extracted so the model config (including compat flags) is unit-testable.
 */

import {
	GLM_53_FLASH_COST,
	DEEPSEEK_V4_FLASH_COST,
	DEEPSEEK_V4_FLASH_0731_COST,
	DEEPSEEK_V4_1_FLASH_COST,
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

export const GLM_53_FLASH = {
	...GLM_53_FLASH_BASE,
	id: "zai/glm-5.3-flash",
	cost: { ...GLM_53_FLASH_COST },
} as const;

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

export const DEEPSEEK_V4_FLASH = {
	...DEEPSEEK_V4_FLASH_BASE,
	id: "deepseek/deepseek-v4-flash",
	cost: { ...DEEPSEEK_V4_FLASH_COST },
	thinkingLevelMap: DEEPSEEK_EFFORT_MAP,
} as const;

export const DEEPSEEK_V4_FLASH_0731 = {
	...DEEPSEEK_V4_FLASH_BASE,
	id: "deepseek/deepseek-v4-flash-0731",
	name: "DeepSeek V4 Flash 0731",
	cost: { ...DEEPSEEK_V4_FLASH_0731_COST },
	thinkingLevelMap: DEEPSEEK_EFFORT_MAP,
} as const;

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

export const DEEPSEEK_V4_1_FLASH = {
	...DEEPSEEK_V4_1_FLASH_BASE,
	id: "deepseek/deepseek-v4.1-flash",
	cost: { ...DEEPSEEK_V4_1_FLASH_COST },
	thinkingLevelMap: DEEPSEEK_EFFORT_MAP,
} as const;

export const ALL_MODELS = [
	GLM_53_FLASH,
	DEEPSEEK_V4_FLASH,
	DEEPSEEK_V4_FLASH_0731,
	DEEPSEEK_V4_1_FLASH,
] as const;
