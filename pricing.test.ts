import { describe, it, expect } from "bun:test";
import {
	GLM_53_FLASH_COST,
	DEEPSEEK_V4_FLASH_COST,
	DEEPSEEK_V4_FLASH_0731_COST,
	DEEPSEEK_V4_1_FLASH_COST,
} from "./pricing.ts";

// Requests are unpinned, so each card is the rate of the host the gateway
// routes that model to by default. Verified against the gateway's own
// `usage.cost` on live probes; drift (peak hours, failover, host-specific
// cache-read rates) is documented in pricing.ts and the README.

describe("GLM 5.3 Flash pricing", () => {
	it("uses the Particle rates", () => {
		expect(GLM_53_FLASH_COST.input).toBe(0.015);
		expect(GLM_53_FLASH_COST.output).toBe(0.05);
		expect(GLM_53_FLASH_COST.cacheRead).toBe(0.003);
		expect(GLM_53_FLASH_COST.cacheWrite).toBe(0);
	});
});

describe("DeepSeek V4 Flash pricing", () => {
	it("bills the V4.1 card the DeepSeek host serves for the retired id", () => {
		expect(DEEPSEEK_V4_FLASH_COST.input).toBe(0.22);
		expect(DEEPSEEK_V4_FLASH_COST.output).toBe(0.66);
		expect(DEEPSEEK_V4_FLASH_COST.cacheRead).toBe(0.007);
		expect(DEEPSEEK_V4_FLASH_COST.cacheWrite).toBe(0);
	});
});

describe("DeepSeek V4 Flash 0731 pricing", () => {
	it("uses the Particle rates", () => {
		expect(DEEPSEEK_V4_FLASH_0731_COST.input).toBe(0.035);
		expect(DEEPSEEK_V4_FLASH_0731_COST.output).toBe(0.07);
		expect(DEEPSEEK_V4_FLASH_0731_COST.cacheRead).toBe(0.007);
		expect(DEEPSEEK_V4_FLASH_0731_COST.cacheWrite).toBe(0);
	});
});

describe("DeepSeek V4.1 Flash pricing", () => {
	it("uses the DeepSeek host's off-peak baseline", () => {
		expect(DEEPSEEK_V4_1_FLASH_COST.input).toBe(0.22);
		expect(DEEPSEEK_V4_1_FLASH_COST.output).toBe(0.66);
		expect(DEEPSEEK_V4_1_FLASH_COST.cacheRead).toBe(0.007);
		expect(DEEPSEEK_V4_1_FLASH_COST.cacheWrite).toBe(0);
	});
});
