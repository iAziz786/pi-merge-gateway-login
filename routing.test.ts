import { describe, it, expect } from "bun:test";
import { resolveVendorAndModel } from "./routing.ts";

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
