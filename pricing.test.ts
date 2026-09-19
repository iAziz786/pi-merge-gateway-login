import { describe, it, expect } from "bun:test";
import {
	GLM_53_FLASH_COST,
	DEEPSEEK_V4_FLASH_COSTS,
	DEEPSEEK_V4_1_FLASH_COSTS,
	DEEPSEEK_V4_FLASH_0731_COST,
	GATEWAY_ROUTED_COSTS,
} from "./pricing.ts";

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

	it("has no empiriolabs entry", () => {
		expect(DEEPSEEK_V4_FLASH_COSTS).not.toHaveProperty("empiriolabs");
	});
});

describe("DeepSeek V4.1 Flash pricing", () => {
	it("uses Particle's promo rates (33% off list)", () => {
		expect(DEEPSEEK_V4_1_FLASH_COSTS.particle.input).toBe(0.2);
		expect(DEEPSEEK_V4_1_FLASH_COSTS.particle.output).toBe(0.8);
		expect(DEEPSEEK_V4_1_FLASH_COSTS.particle.cacheRead).toBe(0.03);
		expect(DEEPSEEK_V4_1_FLASH_COSTS.particle.cacheWrite).toBe(0);
	});

	it("uses Fireworks AI's flat rates", () => {
		expect(DEEPSEEK_V4_1_FLASH_COSTS.fireworks.input).toBe(0.22);
		expect(DEEPSEEK_V4_1_FLASH_COSTS.fireworks.output).toBe(0.66);
		expect(DEEPSEEK_V4_1_FLASH_COSTS.fireworks.cacheRead).toBe(0.007);
		expect(DEEPSEEK_V4_1_FLASH_COSTS.fireworks.cacheWrite).toBe(0);
	});
});

describe("DeepSeek V4 Flash 0731 pricing", () => {
	it("uses Particle's flat rates", () => {
		expect(DEEPSEEK_V4_FLASH_0731_COST.input).toBe(0.035);
		expect(DEEPSEEK_V4_FLASH_0731_COST.output).toBe(0.07);
		expect(DEEPSEEK_V4_FLASH_0731_COST.cacheRead).toBe(0.007);
		expect(DEEPSEEK_V4_FLASH_0731_COST.cacheWrite).toBe(0);
	});
});

describe("gateway-routed pricing", () => {
	it("uses the DeepSeek host's off-peak rates for V4.1 Flash", () => {
		const cost = GATEWAY_ROUTED_COSTS["deepseek/deepseek-v4.1-flash"];
		expect(cost.input).toBe(0.15);
		expect(cost.output).toBe(0.6);
		expect(cost.cacheRead).toBe(0.003);
		expect(cost.cacheWrite).toBe(0);
	});

	it("uses Particle's rates for V4 Flash 0731", () => {
		const cost = GATEWAY_ROUTED_COSTS["deepseek/deepseek-v4-flash-0731"];
		expect(cost.input).toBe(0.035);
		expect(cost.output).toBe(0.07);
		expect(cost.cacheRead).toBe(0.007);
		expect(cost.cacheWrite).toBe(0);
	});
});
