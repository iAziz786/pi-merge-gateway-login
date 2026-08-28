/**
 * GLM-5.3 Flash (zai/glm-5.3-flash) pricing via the Merge Dev gateway.
 *
 * Lowest per-1M-token USD rates from
 * https://docs.merge.dev/merge-gateway/models/details/zai-glm-5-3-flash
 * (Particle / Z.AI hosts — the cheapest of the three listed hosts).
 *
 * Cache-write is not billed on the listed hosts, so it is 0.
 */

export const GLM_53_FLASH_COST = {
	input: 0.015,
	output: 0.05,
	cacheRead: 0.003,
	cacheWrite: 0,
} as const;
