import { describe, it, expect } from "bun:test";
import { pinVendor } from "./routing.ts";

const MODEL_ID = "zai/glm-5.3-flash";

describe("pinVendor", () => {
	it("adds the vendor field when the model matches", () => {
		const out = pinVendor({ model: MODEL_ID, stream: true } as Record<string, unknown>, "particle", MODEL_ID);
		expect((out as Record<string, unknown>).vendor).toBe("particle");
		expect(out.stream).toBe(true);
	});

	it("returns the same payload untouched for other models", () => {
		const payload = { model: "gpt-4o", stream: true } as Record<string, unknown>;
		const out = pinVendor(payload, "particle", MODEL_ID);
		expect(out).toBe(payload);
		expect((out as Record<string, unknown>).vendor).toBeUndefined();
	});
});
