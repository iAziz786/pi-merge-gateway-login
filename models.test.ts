import { describe, it, expect } from "bun:test";
import {
	GLM_53_FLASH,
	DEEPSEEK_V4_FLASH,
	DEEPSEEK_V4_FLASH_0731,
	DEEPSEEK_V4_1_FLASH,
	ALL_MODELS,
} from "./models.ts";

describe("registered models", () => {
	it("uses the gateway's own model ids, one per gateway model", () => {
		expect(ALL_MODELS.map((m) => m.id)).toEqual([
			"zai/glm-5.3-flash",
			"deepseek/deepseek-v4-flash",
			"deepseek/deepseek-v4-flash-0731",
			"deepseek/deepseek-v4.1-flash",
		]);
	});

	it("keeps every id wire-valid (no host prefix, no rewrite needed)", () => {
		const hosts = new Set(["particle", "fireworks", "deepseek", "zai", "baseten", "makora", "together-ai"]);
		for (const model of ALL_MODELS) {
			const [author, ...rest] = model.id.split("/");
			expect(rest.length, `${model.id} must stay "author/name"`).toBe(1);
			expect(hosts.has(author), `${model.id} must not encode a custom host`).toBe(true);
		}
	});

	it("pins no host and carries the credentials-independent compat flags", () => {
		for (const model of ALL_MODELS) {
			expect(model.compat.supportsReasoningEffort).toBe(true);
			expect(model.compat.sessionAffinityFormat).toBe("openrouter");
			expect(model.reasoning).toBe(true);
		}
	});
});

describe("GLM 5.3 Flash", () => {
	it("keeps the Z.AI route limits and folds pi levels onto low/high/max", () => {
		expect(GLM_53_FLASH.contextWindow).toBe(1_000_000);
		expect(GLM_53_FLASH.maxTokens).toBe(131072);
		expect(GLM_53_FLASH.input).toEqual(["text", "image"]);
		expect(GLM_53_FLASH.thinkingLevelMap.off).toBeNull();
		expect(GLM_53_FLASH.thinkingLevelMap.minimal).toBe("low");
		expect(GLM_53_FLASH.thinkingLevelMap.medium).toBe("high");
		expect(GLM_53_FLASH.thinkingLevelMap.xhigh).toBe("max");
		expect(GLM_53_FLASH.cost).toEqual({ input: 0.015, output: 0.05, cacheRead: 0.003, cacheWrite: 0 });
	});
});

describe("DeepSeek V4 Flash", () => {
	it("carries the gateway limits and the host's rates", () => {
		expect(DEEPSEEK_V4_FLASH.contextWindow).toBe(1_048_576);
		expect(DEEPSEEK_V4_FLASH.maxTokens).toBe(384_000);
		expect(DEEPSEEK_V4_FLASH.input).toEqual(["text"]);
		expect(DEEPSEEK_V4_FLASH.cost).toEqual({ input: 0.22, output: 0.66, cacheRead: 0.007, cacheWrite: 0 });
	});

	it("takes the full reasoning ladder", () => {
		for (const level of ["off", "minimal", "low", "medium", "high", "xhigh", "max"] as const) {
			expect(DEEPSEEK_V4_FLASH.thinkingLevelMap[level]).not.toBeUndefined();
		}
		expect(DEEPSEEK_V4_FLASH.thinkingLevelMap.off).toBe("none");
		expect(DEEPSEEK_V4_FLASH.thinkingLevelMap.max).toBe("max");
	});
});

describe("DeepSeek V4 Flash 0731", () => {
	it("is the July snapshot on Particle pricing", () => {
		expect(DEEPSEEK_V4_FLASH_0731.name).toBe("DeepSeek V4 Flash 0731");
		expect(DEEPSEEK_V4_FLASH_0731.contextWindow).toBe(1_048_576);
		expect(DEEPSEEK_V4_FLASH_0731.maxTokens).toBe(384_000);
		expect(DEEPSEEK_V4_FLASH_0731.input).toEqual(["text"]);
		expect(DEEPSEEK_V4_FLASH_0731.cost).toEqual({ input: 0.035, output: 0.07, cacheRead: 0.007, cacheWrite: 0 });
	});
});

describe("DeepSeek V4.1 Flash", () => {
	it("carries image input and the host's rates", () => {
		expect(DEEPSEEK_V4_1_FLASH.contextWindow).toBe(1_000_000);
		expect(DEEPSEEK_V4_1_FLASH.maxTokens).toBe(384_000);
		expect(DEEPSEEK_V4_1_FLASH.input).toEqual(["text", "image"]);
		expect(DEEPSEEK_V4_1_FLASH.cost).toEqual({ input: 0.22, output: 0.66, cacheRead: 0.007, cacheWrite: 0 });
	});
});
