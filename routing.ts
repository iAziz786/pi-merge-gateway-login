/**
 * Request-time vendor pinning for the Merge Dev gateway.
 *
 * The gateway can route a single model to any of its hosts (Particle / Z.AI /
 * Baseten) at different prices. pi computes cost from the model's static
 * `cost` rates and never reads the gateway's response `vendor`/`usage.cost`
 * (those aren't exposed in any extension hook), so the only way to make the
 * displayed cost exact is to force the host at request time via the gateway's
 * `vendor` request field.
 *
 * We pin `vendor: "particle"` so every call routes to Particle and the baked-in
 * Particle rates are accurate.
 */

export function pinVendor<T extends Record<string, unknown>>(
	payload: T,
	vendor: string,
	modelId: string,
): T {
	if (payload.model !== modelId) return payload;
	return { ...payload, vendor };
}
