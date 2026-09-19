import { describe, it, expect } from "bun:test";
import { GATEWAY_ROUTED_IDS, resolveVendorAndModel } from "./routing.ts";
import { ALL_MODELS } from "./models.ts";

describe("resolveVendorAndModel", () => {
	it("maps zai/glm-5.3-flash to vendor zai, no model rewrite", () => {
		const result = resolveVendorAndModel(
			{ model: "zai/glm-5.3-flash", stream: true } as Record<string, unknown>,
			"zai/glm-5.3-flash",
		);
		expect(result).not.toBeNull();
		expect(result!.vendor).toBe("zai");
		expect(result!.gatewayModelId).toBe("zai/glm-5.3-flash");
		expect(result!.payload.model).toBe("zai/glm-5.3-flash");
	});

	it("maps particle/glm-5.3-flash to vendor particle, rewrites model to zai/glm-5.3-flash", () => {
		const result = resolveVendorAndModel(
			{ model: "particle/glm-5.3-flash", stream: true } as Record<string, unknown>,
			"particle/glm-5.3-flash",
		);
		expect(result).not.toBeNull();
		expect(result!.vendor).toBe("particle");
		expect(result!.gatewayModelId).toBe("zai/glm-5.3-flash");
		expect(result!.payload.model).toBe("zai/glm-5.3-flash");
	});

	it("preserves other payload fields", () => {
		const result = resolveVendorAndModel(
			{ model: "particle/glm-5.3-flash", stream: true, max_output_tokens: 4096 } as Record<string, unknown>,
			"particle/glm-5.3-flash",
		);
		expect(result!.payload.stream).toBe(true);
		expect((result!.payload as any).max_output_tokens).toBe(4096);
	});

	it("does not mutate the caller's payload", () => {
		const payload = { model: "particle/glm-5.3-flash", stream: true } as Record<string, unknown>;
		resolveVendorAndModel(payload, "particle/glm-5.3-flash");
		expect(payload.model).toBe("particle/glm-5.3-flash");
		expect(payload).not.toHaveProperty("vendor");
	});

	it("returns null for unknown models", () => {
		const payload = { model: "gpt-4o", stream: true } as Record<string, unknown>;
		const result = resolveVendorAndModel(payload, "gpt-4o");
		expect(result).toBeNull();
	});

	it("maps particle/deepseek-v4-flash to vendor particle, rewrites model to deepseek/deepseek-v4-flash", () => {
		const result = resolveVendorAndModel(
			{ model: "particle/deepseek-v4-flash", stream: true } as Record<string, unknown>,
			"particle/deepseek-v4-flash",
		);
		expect(result).not.toBeNull();
		expect(result!.vendor).toBe("particle");
		expect(result!.gatewayModelId).toBe("deepseek/deepseek-v4-flash");
		expect(result!.payload.model).toBe("deepseek/deepseek-v4-flash");
	});

	it("does not map empiriolabs model ids", () => {
		const result = resolveVendorAndModel(
			{ model: "empiriolabs/deepseek-v4-flash" } as Record<string, unknown>,
			"empiriolabs/deepseek-v4-flash",
		);
		expect(result).toBeNull();
	});

	it("maps deepseek/deepseek-v4-flash to vendor deepseek, no rewrite", () => {
		const result = resolveVendorAndModel(
			{ model: "deepseek/deepseek-v4-flash", stream: true } as Record<string, unknown>,
			"deepseek/deepseek-v4-flash",
		);
		expect(result).not.toBeNull();
		expect(result!.vendor).toBe("deepseek");
		expect(result!.gatewayModelId).toBe("deepseek/deepseek-v4-flash");
		expect(result!.payload.model).toBe("deepseek/deepseek-v4-flash");
	});

	it("maps particle/deepseek-v4-flash-0731 to vendor particle", () => {
		const result = resolveVendorAndModel(
			{ model: "particle/deepseek-v4-flash-0731", stream: true } as Record<string, unknown>,
			"particle/deepseek-v4-flash-0731",
		);
		expect(result).not.toBeNull();
		expect(result!.vendor).toBe("particle");
		expect(result!.gatewayModelId).toBe("deepseek/deepseek-v4-flash-0731");
		expect(result!.payload.model).toBe("deepseek/deepseek-v4-flash-0731");
	});

	it("maps particle/deepseek-v4.1-flash to vendor particle", () => {
		const result = resolveVendorAndModel(
			{ model: "particle/deepseek-v4.1-flash", stream: true } as Record<string, unknown>,
			"particle/deepseek-v4.1-flash",
		);
		expect(result).not.toBeNull();
		expect(result!.vendor).toBe("particle");
		expect(result!.gatewayModelId).toBe("deepseek/deepseek-v4.1-flash");
		expect(result!.payload.model).toBe("deepseek/deepseek-v4.1-flash");
	});

	it("maps fireworks/deepseek-v4.1-flash to vendor fireworks, same gateway model", () => {
		const result = resolveVendorAndModel(
			{ model: "fireworks/deepseek-v4.1-flash", stream: true } as Record<string, unknown>,
			"fireworks/deepseek-v4.1-flash",
		);
		expect(result).not.toBeNull();
		expect(result!.vendor).toBe("fireworks");
		expect(result!.gatewayModelId).toBe("deepseek/deepseek-v4.1-flash");
		expect(result!.payload.model).toBe("deepseek/deepseek-v4.1-flash");
	});
});

describe("VENDOR_MAP and gateway-routed registry consistency with ALL_MODELS", () => {
	it("every registered model id is either vendor-pinned or gateway-routed", () => {
		for (const model of ALL_MODELS) {
			const result = resolveVendorAndModel({ model: model.id } as Record<string, unknown>, model.id);
			if (GATEWAY_ROUTED_IDS[model.id]) {
				expect(result, `${model.id} must pass through unrewritten`).toBeNull();
				continue;
			}
			expect(result, `no VENDOR_MAP entry for ${model.id}`).not.toBeNull();
			expect(result!.vendor).toBe(model.id.split("/")[0]);
		}
	});

	it("every rewrite target is a registered, wire-valid model id", () => {
		const registered = new Set(ALL_MODELS.map((m) => m.id));
		for (const model of ALL_MODELS) {
			const resolved = resolveVendorAndModel({ model: model.id } as Record<string, unknown>, model.id);
			if (!resolved) continue;
			expect(registered.has(resolved.gatewayModelId), `${resolved.gatewayModelId} not registered`).toBe(true);
		}
	});
});
