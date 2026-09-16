import { describe, it, expect } from "bun:test";
import registerExtension from "./index.ts";
import { resolveGatewayRequest } from "./index.ts";

describe("provider registration", () => {
	function captureConfig() {
		const configs: Record<string, Record<string, unknown>> = {};
		const pi = {
			registerProvider: (id: string, config: Record<string, unknown>) => {
				configs[id] = config;
			},
			on: () => {},
		};
		registerExtension(pi as never);
		return configs;
	}

	it("registers under the merge-gateway id", () => {
		expect(Object.keys(captureConfig())).toEqual(["merge-gateway"]);
	});

	it("passes apiKey as env var name without $ prefix", () => {
		expect(captureConfig()["merge-gateway"]?.["apiKey"]).toBe("MERGE_GATEWAY_API_KEY");
	});
});

describe("resolveGatewayRequest (before_provider_request handler)", () => {
	it("rewrites model and injects vendor for a known pi model id", () => {
		const out = resolveGatewayRequest({ model: "particle/glm-5.3-flash", stream: true });
		expect(out).toEqual({
			model: "zai/glm-5.3-flash",
			vendor: "particle",
			stream: true,
		});
	});

	it("does not mutate the caller's payload", () => {
		const payload = { model: "particle/glm-5.3-flash", stream: true };
		resolveGatewayRequest(payload);
		expect(payload.model).toBe("particle/glm-5.3-flash");
		expect(payload).not.toHaveProperty("vendor");
	});

	it("returns undefined when payload is undefined", () => {
		expect(resolveGatewayRequest(undefined)).toBeUndefined();
	});

	it("returns undefined when payload is null", () => {
		expect(resolveGatewayRequest(null)).toBeUndefined();
	});

	it("returns undefined when payload is not an object", () => {
		expect(resolveGatewayRequest("zai/glm-5.3-flash")).toBeUndefined();
	});

	it("returns undefined when payload.model is missing", () => {
		expect(resolveGatewayRequest({ stream: true })).toBeUndefined();
	});

	it("returns undefined when payload.model is not a string", () => {
		expect(resolveGatewayRequest({ model: 42 })).toBeUndefined();
	});

	it("returns undefined for models not in VENDOR_MAP (other providers untouched)", () => {
		expect(resolveGatewayRequest({ model: "gpt-4o", stream: true })).toBeUndefined();
	});
});

describe("resolveGatewayRequest particle-only prompt_cache_key", () => {
	it("adds prompt_cache_key from sessionId for particle/glm-5.3-flash", () => {
		const out = resolveGatewayRequest({ model: "particle/glm-5.3-flash", stream: true }, "sess-123");
		expect(out).toEqual({
			model: "zai/glm-5.3-flash",
			vendor: "particle",
			stream: true,
			prompt_cache_key: "sess-123",
		});
	});

	it("adds prompt_cache_key from sessionId for particle/deepseek-v4-flash", () => {
		const out = resolveGatewayRequest({ model: "particle/deepseek-v4-flash", stream: true }, "sess-abc");
		expect(out?.prompt_cache_key).toBe("sess-abc");
		expect(out?.vendor).toBe("particle");
	});

	it("does not add prompt_cache_key for zai/glm-5.3-flash even with sessionId", () => {
		const out = resolveGatewayRequest({ model: "zai/glm-5.3-flash", stream: true }, "sess-123");
		expect(out).not.toHaveProperty("prompt_cache_key");
	});

	it("does not add prompt_cache_key for deepseek/deepseek-v4-flash even with sessionId", () => {
		const out = resolveGatewayRequest({ model: "deepseek/deepseek-v4-flash", stream: true }, "sess-123");
		expect(out).not.toHaveProperty("prompt_cache_key");
	});

	it("does not overwrite existing prompt_cache_key for particle", () => {
		const out = resolveGatewayRequest(
			{ model: "particle/glm-5.3-flash", stream: true, prompt_cache_key: "pi-key" },
			"sess-123",
		);
		expect(out?.prompt_cache_key).toBe("pi-key");
	});

	it("does not add prompt_cache_key when sessionId missing or empty", () => {
		expect(resolveGatewayRequest({ model: "particle/glm-5.3-flash" })).not.toHaveProperty("prompt_cache_key");
		expect(resolveGatewayRequest({ model: "particle/glm-5.3-flash" }, "")).not.toHaveProperty("prompt_cache_key");
	});
});
