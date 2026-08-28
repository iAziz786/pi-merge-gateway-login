import { describe, it, expect } from "bun:test";
import { GLM_53_FLASH_COST } from "./pricing.ts";

describe("GLM-5.3 Flash pricing", () => {
	it("uses the documented lowest per-1M-token rates", () => {
		expect(GLM_53_FLASH_COST.input).toBe(0.015);
		expect(GLM_53_FLASH_COST.output).toBe(0.05);
		expect(GLM_53_FLASH_COST.cacheRead).toBe(0.003);
		expect(GLM_53_FLASH_COST.cacheWrite).toBe(0);
	});
});
