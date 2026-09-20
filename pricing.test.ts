import { describe, it, expect } from "bun:test";
import {
	GLM_53_FLASH_COST,
	DEEPSEEK_V4_FLASH_COST,
	DEEPSEEK_V4_FLASH_0731_COST,
	DEEPSEEK_V4_1_FLASH_COST,
} from "./pricing.ts";

// Each card is the rate of the vendor the gateway prefers for that model (the
// cheapest eligible one) and was verified against the gateway's own `usage.cost`
// on live probes. The gateway routes per request and fails over to pricier
// vendors, and DeepSeek's own API doubles its rates inside its weekday peak
// windows; pi prices from these flat cards, so both are documented in
// pricing.ts and the README.

describe("GLM 5.3 Flash pricing", () => {
	it("uses the Particle rates", () => {
		expect(GLM_53_FLASH_COST).toEqual({ input: 0.015, output: 0.05, cacheRead: 0.003, cacheWrite: 0 });
	});
});

describe("DeepSeek V4 Flash pricing", () => {
	it("bills the same card as V4.1 Flash, because the gateway resolves the retired id to it", () => {
		expect(DEEPSEEK_V4_FLASH_COST).toEqual(DEEPSEEK_V4_1_FLASH_COST);
	});
});

describe("DeepSeek V4 Flash 0731 pricing", () => {
	it("uses the Particle rates", () => {
		expect(DEEPSEEK_V4_FLASH_0731_COST).toEqual({
			input: 0.035,
			output: 0.07,
			cacheRead: 0.007,
			cacheWrite: 0,
		});
	});
});

describe("DeepSeek V4.1 Flash pricing", () => {
	it("uses DeepSeek's off-peak base rates", () => {
		expect(DEEPSEEK_V4_1_FLASH_COST).toEqual({
			input: 0.15,
			output: 0.6,
			cacheRead: 0.003,
			cacheWrite: 0,
		});
	});
});
