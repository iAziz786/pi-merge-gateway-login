import { describe, it, expect } from "bun:test";
import { GLM_53_FLASH_COST, DEEPSEEK_V4_FLASH_COSTS } from "./pricing.ts";

describe("GLM-5.3 Flash pricing", () => {
	it("uses the documented lowest per-1M-token rates", () => {
		expect(GLM_53_FLASH_COST.input).toBe(0.015);
		expect(GLM_53_FLASH_COST.output).toBe(0.05);
		expect(GLM_53_FLASH_COST.cacheRead).toBe(0.003);
		expect(GLM_53_FLASH_COST.cacheWrite).toBe(0);
	});
});

describe("DeepSeek V4 Flash pricing", () => {
	it("uses official DeepSeek rates (off-peak baseline)", () => {
		expect(DEEPSEEK_V4_FLASH_COSTS.deepseek.input).toBe(0.22);
		expect(DEEPSEEK_V4_FLASH_COSTS.deepseek.output).toBe(0.66);
		expect(DEEPSEEK_V4_FLASH_COSTS.deepseek.cacheRead).toBe(0.007);
		expect(DEEPSEEK_V4_FLASH_COSTS.deepseek.cacheWrite).toBe(0);
	});

	it("uses Particle rates (flat, cheapest)", () => {
		expect(DEEPSEEK_V4_FLASH_COSTS.particle.input).toBe(0.035);
		expect(DEEPSEEK_V4_FLASH_COSTS.particle.output).toBe(0.07);
		expect(DEEPSEEK_V4_FLASH_COSTS.particle.cacheRead).toBe(0.007);
		expect(DEEPSEEK_V4_FLASH_COSTS.particle.cacheWrite).toBe(0);
	});

	it("uses Empiriolabs rates (no cache-read billing listed)", () => {
		expect(DEEPSEEK_V4_FLASH_COSTS.empiriolabs.input).toBe(0.14);
		expect(DEEPSEEK_V4_FLASH_COSTS.empiriolabs.output).toBe(0.28);
		expect(DEEPSEEK_V4_FLASH_COSTS.empiriolabs.cacheRead).toBe(0);
		expect(DEEPSEEK_V4_FLASH_COSTS.empiriolabs.cacheWrite).toBe(0);
	});
});
