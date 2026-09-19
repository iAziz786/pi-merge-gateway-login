/**
 * Per-1M-token USD rates for the models this provider exposes: the card of the
 * host the Merge Dev gateway routes each model to today, verified against the
 * gateway's own `usage.cost` on live probes (`x-merge-vendor` names the host).
 *
 * Requests are unpinned by design, so the host is the gateway's choice and can
 * move — and with it the bill:
 *
 * - `deepseek/deepseek-v4-flash` and `deepseek/deepseek-v4.1-flash` route to
 *   Fireworks AI today ($0.22/$0.66/cache $0.007). The same models span DeepSeek
 *   ($0.15/$0.60/cache $0.003, 2x during weekday peak hours 01:00-04:00 and
 *   06:00-10:00 UTC, weekends never peak), Particle ($0.20/$0.80 while its promo
 *   runs, $0.30/$1.20 after) and Baseten ($0.30/$1.20).
 * - `zai/glm-5.3-flash` and `deepseek/deepseek-v4-flash-0731` route to Particle.
 *
 * Cache-read rates differ per host, and agent sessions are mostly cache reads,
 * so a host change skews the displayed cost harder than the input/output delta
 * suggests. Reconcile against `usage.cost` in the response when it must be
 * exact.
 *
 * Cache-write is not billed on any of these routes, so it is 0.
 */

/** GLM 5.3 Flash (zai/glm-5.3-flash) — Particle host. */
export const GLM_53_FLASH_COST = {
	input: 0.015,
	output: 0.05,
	cacheRead: 0.003,
	cacheWrite: 0,
} as const;

/**
 * DeepSeek V4 Flash (deepseek/deepseek-v4-flash) — Fireworks AI host.
 *
 * The DeepSeek host serves this retired id with V4.1 Flash weights; measurements
 * against `usage.cost` matched the Fireworks card exactly ($0.22 in, $0.66 out,
 * $0.007 cache read).
 */
export const DEEPSEEK_V4_FLASH_COST = {
	input: 0.22,
	output: 0.66,
	cacheRead: 0.007,
	cacheWrite: 0,
} as const;

/** DeepSeek V4 Flash 0731 (deepseek/deepseek-v4-flash-0731) — Particle host. */
export const DEEPSEEK_V4_FLASH_0731_COST = {
	input: 0.035,
	output: 0.07,
	cacheRead: 0.007,
	cacheWrite: 0,
} as const;

/** DeepSeek V4.1 Flash (deepseek/deepseek-v4.1-flash) — Fireworks AI host. */
export const DEEPSEEK_V4_1_FLASH_COST = {
	input: 0.22,
	output: 0.66,
	cacheRead: 0.007,
	cacheWrite: 0,
} as const;
