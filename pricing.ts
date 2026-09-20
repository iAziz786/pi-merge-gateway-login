/**
 * Per-1M-token USD rates for the models this provider exposes: one card per
 * model, priced at the vendor the Merge Dev gateway prefers for it.
 *
 * The gateway routes each request to the cheapest eligible vendor of the model
 * and fails over to the next when that vendor cannot take it. Observed on
 * unpinned probes (`x-merge-vendor` names the serving vendor):
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
 * Every card is the preferred vendor's published rate, verified against the
 * gateway's own `usage.cost` on cold and cache-hit probes, exact to nine
 * decimals. Two things the display cannot follow:
 *
 * - Failover. pi prices from these cards — one per model, no per-vendor axis —
 *   and never reads `usage.cost`, so a turn on a pricier vendor understates:
 *   Particle is 1.3x DeepSeek's rate for the V4.1 family, Makora is 2.6x
 *   Particle's for V4 Flash 0731, and the 0.15/0.50 vendors are 10x Particle's
 *   for GLM.
 * - DeepSeek's peak windows. Its price sheet lists the base rates below plus a
 *   `schedule` that doubles them (0.30/1.20/cache 0.006) on weekdays 01:00-04:00
 *   and 06:00-10:00 UTC. pi's model configs accept four flat rates — both the
 *   extension `ProviderModelConfig.cost` shape and `models.yml` overrides — so a
 *   peak-hour turn displays half of what is billed. The card carries the base
 *   (off-peak) rates, which the probes verified.
 *
 * Look at `usage.cost` in the response when a number must be exact.
 *
 * Cache-write is not billed on any of these routes, so it is 0.
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
