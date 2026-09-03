import { describe, it, expect } from "bun:test";
import registerExtension from "./index.ts";
import { resolveGatewayRequest } from "./index.ts";

describe("provider registration", () => {
	it("registers under the merge-gateway id", () => {
		const registered: string[] = [];
		const pi = {
			registerProvider: (id: string) => {
				registered.push(id);
			},
			on: () => {},
		};
		registerExtension(pi as never);
		expect(registered).toEqual(["merge-gateway"]);
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
