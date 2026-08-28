import { describe, it, expect } from "bun:test";
import { GLM_53_FLASH_MODEL } from "./models.ts";

describe("GLM 5.3 Flash model config", () => {
	it("sends x-session-id header for automatic caching (sessionAffinityFormat: openrouter)", () => {
		expect(GLM_53_FLASH_MODEL.compat.sessionAffinityFormat).toBe("openrouter");
	});

	it("supports reasoning with effort levels", () => {
		expect(GLM_53_FLASH_MODEL.reasoning).toBe(true);
		expect(GLM_53_FLASH_MODEL.compat.supportsReasoningEffort).toBe(true);
	});

	it("maps thinking levels to upstream values", () => {
		const map = GLM_53_FLASH_MODEL.thinkingLevelMap;
		expect(map.off).toBeNull();
		expect(map.low).toBe("low");
		expect(map.medium).toBe("high");
		expect(map.high).toBe("high");
		expect(map.max).toBe("max");
	});
});
