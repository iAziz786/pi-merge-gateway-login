/**
 * Request-time vendor selection and model rewriting for the Merge Dev gateway.
 *
 * The gateway can route a single model to any of its hosts (Particle / Z.AI /
 * Baseten) at different prices. pi computes cost from the model's static
 * `cost` rates and never reads the gateway's response `vendor`/`usage.cost`
 * (those aren't exposed in any extension hook), so the only way to make the
 * displayed cost exact is to force the host at request time via the gateway's
 * `vendor` request field.
 *
 * Both pi model IDs (`zai/glm-5.3-flash` and `particle/glm-5.3-flash`) map to
 * the same gateway model `zai/glm-5.3-flash`. The vendor field selects the host.
 */

// pi model ID → { vendor, gateway model ID }
// Vendor-prefixed IDs (particle/…, empiriolabs/…) select the execution host;
// the official-vendor ID (zai/…, deepseek/…) routes to the vendor itself.
const VENDOR_MAP: Record<string, { vendor: string; gatewayModelId: string }> = {
	"zai/glm-5.3-flash": { vendor: "zai", gatewayModelId: "zai/glm-5.3-flash" },
	"particle/glm-5.3-flash": { vendor: "particle", gatewayModelId: "zai/glm-5.3-flash" },
	"deepseek/deepseek-v4-flash": { vendor: "deepseek", gatewayModelId: "deepseek/deepseek-v4-flash" },
	"particle/deepseek-v4-flash": { vendor: "particle", gatewayModelId: "deepseek/deepseek-v4-flash" },
};

export function resolveVendorAndModel<T extends Record<string, unknown>>(
	payload: T,
	piModelId: string,
): { payload: T; vendor: string; gatewayModelId: string } | null {
	const entry = VENDOR_MAP[piModelId];
	if (!entry) return null;
	return {
		payload: { ...payload, model: entry.gatewayModelId },
		vendor: entry.vendor,
		gatewayModelId: entry.gatewayModelId,
	};
}
