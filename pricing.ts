/**
 * Fallback cost cards: one per bundled model, priced at the vendor the Merge Dev
 * gateway prefers for it.
 *
 * These only apply when the gateway's catalog could not be fetched — every live
 * turn is repriced from the catalog at the vendor that actually served it (see
 * catalog.ts and the `after_provider_response` hook in index.ts). The gateway
 * routes each request to the cheapest eligible vendor and fails over to the next
 * when that vendor cannot take it, so a static card is the common case, never a
 * guarantee. Observed on unpinned probes (`x-merge-vendor` names the serving
 * vendor):
 *
 * - V4.1 Flash and the retired V4 Flash id → DeepSeek's own API, the cheapest of
 *   its four vendors (0.15/0.60 against Particle 0.20/0.80, Fireworks
 *   0.22/0.66, Baseten 0.30/1.20), 4 of 4 probes.
 * - GLM 5.3 Flash → Particle, tied cheapest with z.ai at 0.015/0.05 against
 *   0.15/0.50 for Baseten, Fireworks, Together and 0.45/1.50 for Modal, 4 of 4.
 * - V4 Flash 0731 → Particle (0.035/0.07, cheapest of five) on two probes and
 *   Makora (0.09/0.195) on two: the preferred vendor alternates, so failover is
 *   real, not hypothetical.
 *
 * Each card was verified against the gateway's own `usage.cost` on cold and
 * cache-hit probes, exact to nine decimals. DeepSeek's own API doubles its rates
 * inside its weekday peak windows (01:00-04:00 and 06:00-10:00 UTC) — the live
 * path applies that from the gateway's `schedule`; these flat cards carry the
 * base rates. Cache-write is not billed on these four routes, so it is 0.
 */

/** GLM 5.3 Flash (zai/glm-5.3-flash) — Particle vendor. */
export const GLM_53_FLASH_COST = {
	input: 0.015,
	output: 0.05,
	cacheRead: 0.003,
	cacheWrite: 0,
} as const;

/**
 * DeepSeek V4 Flash (deepseek/deepseek-v4-flash).
 *
 * The id is retired: the gateway resolves it to V4.1 Flash, so it bills the
 * vendor the V4.1 model bills — DeepSeek's own API, not the Particle or
 * Empiriolabs entries listed on the retired id itself.
 */
export const DEEPSEEK_V4_FLASH_COST = {
	input: 0.15,
	output: 0.6,
	cacheRead: 0.003,
	cacheWrite: 0,
} as const;

/**
 * DeepSeek V4 Flash 0731 (deepseek/deepseek-v4-flash-0731) — Particle vendor,
 * with Makora (0.09/0.195/cache 0.0196) as the observed failover.
 */
export const DEEPSEEK_V4_FLASH_0731_COST = {
	input: 0.035,
	output: 0.07,
	cacheRead: 0.007,
	cacheWrite: 0,
} as const;

/** DeepSeek V4.1 Flash (deepseek/deepseek-v4.1-flash) — DeepSeek's own API. */
export const DEEPSEEK_V4_1_FLASH_COST = {
	input: 0.15,
	output: 0.6,
	cacheRead: 0.003,
	cacheWrite: 0,
} as const;
