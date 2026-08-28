import { describe, it, expect } from "bun:test";
import { resolveVendorAndModel } from "./routing.ts";
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
});

describe("VENDOR_MAP consistency with ALL_MODELS", () => {
	it("every registered model id resolves to a vendor", () => {
		for (const model of ALL_MODELS) {
			const result = resolveVendorAndModel(
				{ model: model.id } as Record<string, unknown>,
				model.id,
			);
			expect(result, `no VENDOR_MAP entry for ${model.id}`).not.toBeNull();
			expect(result!.vendor).toBe(model.id.split("/")[0]);
		}
	});

	it("rewritten gateway model id has a matching registered model (no dangling ids)", () => {
		const registeredGatewayIds = new Set(
			ALL_MODELS.map((m) =>
				resolveVendorAndModel({ model: m.id } as Record<string, unknown>, m.id)!.gatewayModelId,
			),
		);
		for (const model of ALL_MODELS) {
			const resolved = resolveVendorAndModel(
				{ model: model.id } as Record<string, unknown>,
				model.id,
			)!;
			expect(registeredGatewayIds.has(resolved.gatewayModelId)).toBe(true);
		}
	});
});
