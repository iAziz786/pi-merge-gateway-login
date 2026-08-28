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
