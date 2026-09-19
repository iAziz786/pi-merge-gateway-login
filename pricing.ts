/**
 * GLM-5.3 Flash (zai/glm-5.3-flash) pricing via the Merge Dev gateway.
 *
 * Per-1M-token USD rates for the **Particle** vendor/host, from
 * https://docs.merge.dev/merge-gateway/models/details/zai-glm-5-3-flash
 * (Particle is the cheapest of the three listed hosts: Particle / Z.AI / Baseten).
 *
 * Cache-write is not billed on the Particle host, so it is 0.
 */

// Vendor/host this pricing is pinned to. The Merge Dev gateway can route a
// request to any of its hosts (Particle / Z.AI / Baseten); the rates below are
// the Particle ones, so displayed cost is accurate only when Particle serves.
export const GLM_53_FLASH_VENDOR = "particle" as const;

export const GLM_53_FLASH_COST = {
	input: 0.015,
	output: 0.05,
	cacheRead: 0.003,
	cacheWrite: 0,
} as const;

/**
 * DeepSeek V4 Flash (deepseek/deepseek-v4-flash) pricing via the Merge Dev
 * gateway, per vendor/host, from
 * https://docs.merge.dev/merge-gateway/models/details/deepseek-deepseek-v4-flash
 *
 * Particle is flat (no peak hours) and supports ZDR. The official DeepSeek
 * host bills 2× the baseline during peak hours (01:00–04:00, 06:00–10:00 UTC;
 * weekends are never peak). The rates below are the off-peak baseline, so for
 * the `deepseek` variant the displayed cost is a lower bound during weekday
 * peaks.
 */
export const DEEPSEEK_V4_FLASH_COSTS = {
	deepseek: { input: 0.22, output: 0.66, cacheRead: 0.007, cacheWrite: 0 },
	particle: { input: 0.035, output: 0.07, cacheRead: 0.007, cacheWrite: 0 },
} as const;

/**
 * DeepSeek V4.1 Flash (deepseek/deepseek-v4.1-flash) pricing via the Merge Dev
 * gateway, per vendor/host, from
 * https://docs.merge.dev/merge-gateway/models/details/deepseek-deepseek-v4-1-flash
 *
 * Fireworks AI is flat. Particle's $0.20/$0.80 is a 33% promo off $0.30/$1.20
 * that ends Nov 1, 2026, so past that date the displayed Particle cost is a
 * lower bound. Cache-write is not billed on either route, so it is 0.
 */
export const DEEPSEEK_V4_1_FLASH_COSTS = {
	particle: { input: 0.2, output: 0.8, cacheRead: 0.03, cacheWrite: 0 },
	fireworks: { input: 0.22, output: 0.66, cacheRead: 0.007, cacheWrite: 0 },
} as const;

/**
 * DeepSeek V4 Flash 0731 (deepseek/deepseek-v4-flash-0731) pricing via the
 * Merge Dev gateway, from
 * https://docs.merge.dev/merge-gateway/models/details/deepseek-deepseek-v4-flash-0731
 *
 * The Particle host is the only vendor registered here; its flat rates match
 * the floating deepseek/deepseek-v4-flash id. Cache-write is not billed, so it
 * is 0.
 */
export const DEEPSEEK_V4_FLASH_0731_COST = {
	input: 0.035,
	output: 0.07,
	cacheRead: 0.007,
	cacheWrite: 0,
} as const;
