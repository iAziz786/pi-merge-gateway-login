import { describe, it, expect } from "bun:test";
import { ZAI_GLM_53_FLASH, PARTICLE_GLM_53_FLASH } from "./models.ts";

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
