import { describe, it, expect } from "bun:test";
import {
	ZAI_GLM_53_FLASH,
	PARTICLE_GLM_53_FLASH,
	DEEPSEEK_V4_FLASH_MODELS,
} from "./models.ts";

describe("Z.AI GLM 5.3 Flash", () => {
	it("has gateway model id zai/glm-5.3-flash", () => {
		expect(ZAI_GLM_53_FLASH.id).toBe("zai/glm-5.3-flash");
	});

	it("sends x-session-id header for automatic caching", () => {
		expect(ZAI_GLM_53_FLASH.compat.sessionAffinityFormat).toBe("openrouter");
	});

	it("supports reasoning with effort levels", () => {
		expect(ZAI_GLM_53_FLASH.reasoning).toBe(true);
		expect(ZAI_GLM_53_FLASH.compat.supportsReasoningEffort).toBe(true);
	});

	it("maps thinking levels to upstream values", () => {
		const map = ZAI_GLM_53_FLASH.thinkingLevelMap;
		expect(map.off).toBeNull();
		expect(map.low).toBe("low");
		expect(map.medium).toBe("high");
		expect(map.high).toBe("high");
		expect(map.max).toBe("max");
	});
});

describe("Particle GLM 5.3 Flash", () => {
	it("has pi model id particle/glm-5.3-flash", () => {
		expect(PARTICLE_GLM_53_FLASH.id).toBe("particle/glm-5.3-flash");
	});

	it("shares identical config with Z.AI variant", () => {
		expect(PARTICLE_GLM_53_FLASH.reasoning).toBe(ZAI_GLM_53_FLASH.reasoning);
		expect(PARTICLE_GLM_53_FLASH.contextWindow).toBe(ZAI_GLM_53_FLASH.contextWindow);
		expect(PARTICLE_GLM_53_FLASH.maxTokens).toBe(ZAI_GLM_53_FLASH.maxTokens);
		expect(PARTICLE_GLM_53_FLASH.cost).toEqual(ZAI_GLM_53_FLASH.cost);
		expect(PARTICLE_GLM_53_FLASH.compat).toEqual(ZAI_GLM_53_FLASH.compat);
	});
});

describe("DeepSeek V4 Flash models", () => {
	it("exports one model per vendor", () => {
		const ids = DEEPSEEK_V4_FLASH_MODELS.map((m) => m.id).sort();
		expect(ids).toEqual([
			"deepseek/deepseek-v4-flash",
			"empiriolabs/deepseek-v4-flash",
			"particle/deepseek-v4-flash",
		]);
	});

	it("each model has identical non-vendor config", () => {
		for (const m of DEEPSEEK_V4_FLASH_MODELS) {
			expect(m.name).toBe("DeepSeek V4 Flash");
			expect(m.reasoning).toBe(true);
			expect(m.contextWindow).toBe(1_000_000);
			expect(m.maxTokens).toBe(393216);
			expect(m.input).toEqual(["text"]);
		}
	});

	it("uses Particle's max output (384K) for all variants", () => {
		for (const m of DEEPSEEK_V4_FLASH_MODELS) {
			expect(m.maxTokens).toBe(384 * 1024);
		}
	});

	it("supports reasoning with effort levels", () => {
		for (const m of DEEPSEEK_V4_FLASH_MODELS) {
			expect(m.compat.supportsReasoningEffort).toBe(true);
			expect(m.compat.sessionAffinityFormat).toBe("openrouter");
		}
	});

	it("maps thinking levels to upstream values", () => {
		for (const m of DEEPSEEK_V4_FLASH_MODELS) {
			expect(m.thinkingLevelMap.off).toBe("none");
			expect(m.thinkingLevelMap.low).toBe("low");
			expect(m.thinkingLevelMap.medium).toBe("medium");
			expect(m.thinkingLevelMap.high).toBe("high");
			expect(m.thinkingLevelMap.max).toBe("max");
		}
	});

	it("has per-vendor costs baked in", () => {
		const byId = new Map(DEEPSEEK_V4_FLASH_MODELS.map((m) => [m.id, m]));
		expect(byId.get("deepseek/deepseek-v4-flash")!.cost.input).toBe(0.22);
		expect(byId.get("particle/deepseek-v4-flash")!.cost.input).toBe(0.035);
		expect(byId.get("empiriolabs/deepseek-v4-flash")!.cost.input).toBe(0.14);
	});
});
