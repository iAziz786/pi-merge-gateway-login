import { describe, it, expect } from "bun:test";
import registerExtension from "./index.ts";
import { resolveGatewayRequest } from "./index.ts";

function captureConfig(env?: string) {
	const prev = process.env.MERGE_GATEWAY_API_KEY;
	if (env === undefined) delete process.env.MERGE_GATEWAY_API_KEY;
	else process.env.MERGE_GATEWAY_API_KEY = env;
	try {
		const configs: Record<string, Record<string, unknown>> = {};
		const pi = {
			registerProvider: (id: string, config: Record<string, unknown>) => {
				configs[id] = config;
			},
			on: () => {},
		};
		registerExtension(pi as never);
		return configs;
	} finally {
		if (prev === undefined) delete process.env.MERGE_GATEWAY_API_KEY;
		else process.env.MERGE_GATEWAY_API_KEY = prev;
	}
}

describe("provider registration", () => {
	it("registers under the merge-gateway id", () => {
		expect(Object.keys(captureConfig("mg__test"))).toEqual(["merge-gateway"]);
	});

	it("passes the env var name so host resolves it", () => {
		expect(captureConfig("mg__test_env_key")["merge-gateway"]?.["apiKey"]).toBe("MERGE_GATEWAY_API_KEY");
	});

	it("keeps apiKey declared when env is missing (host falls back to stored login)", () => {
		expect(captureConfig()["merge-gateway"]?.["apiKey"]).toBe("MERGE_GATEWAY_API_KEY");
	});
});

describe("oauth login", () => {
	function getLogin() {
		const oauth = captureConfig()["merge-gateway"]?.["oauth"] as
			| { name: string; login: (callbacks: Record<string, unknown>) => Promise<string> }
			| undefined;
		if (typeof oauth?.login !== "function") throw new Error("oauth.login not registered");
		return oauth;
	}

	it("registers oauth for /login support", () => {
		expect(getLogin().name).toBe("Merge Dev");
	});

	it("returns the trimmed key after validation", async () => {
		const seen: { url: unknown; authorization: unknown }[] = [];
		const key = await getLogin().login({
			onPrompt: async () => "  mg__test_key  ",
			onAuth: () => {},
			fetch: (async (url: unknown, init: { headers?: Record<string, string> }) => {
				seen.push({ url, authorization: init?.headers?.["Authorization"] });
				return { ok: true, status: 200 };
			}) as never,
		} as never);
		expect(key).toBe("mg__test_key");
		expect(seen).toHaveLength(1);
		expect(String(seen[0]?.url)).toContain("/models");
		expect(seen[0]?.authorization).toBe("Bearer mg__test_key");
	});

	it("throws on invalid key without returning it", async () => {
		await expect(
			getLogin().login({
				onPrompt: async () => "mg__bad",
				onAuth: () => {},
				fetch: (async () => ({ ok: false, status: 401 })) as never,
			} as never),
		).rejects.toThrow("401");
	});

	it("throws on empty input without validating", async () => {
		let fetched = false;
		await expect(
			getLogin().login({
				onPrompt: async () => "   ",
				onAuth: () => {},
				fetch: (async () => {
					fetched = true;
					return { ok: true, status: 200 };
				}) as never,
			} as never),
		).rejects.toThrow();
		expect(fetched).toBe(false);
	});
});

describe("resolveGatewayRequest (before_provider_request handler)", () => {
	it("adds the session key and leaves the model id untouched", () => {
		expect(resolveGatewayRequest({ model: "deepseek/deepseek-v4.1-flash", stream: true }, "sess-gw")).toEqual({
			model: "deepseek/deepseek-v4.1-flash",
			stream: true,
			prompt_cache_key: "sess-gw",
		});
	});

	it("does not mutate the caller's payload", () => {
		const payload = { model: "deepseek/deepseek-v4.1-flash", stream: true };
		resolveGatewayRequest(payload, "sess-gw");
		expect(payload).not.toHaveProperty("prompt_cache_key");
	});

	it("returns undefined when payload is undefined", () => {
		expect(resolveGatewayRequest(undefined, "sess-gw")).toBeUndefined();
	});

	it("returns undefined when payload is null", () => {
		expect(resolveGatewayRequest(null, "sess-gw")).toBeUndefined();
	});

	it("returns undefined when payload is not an object", () => {
		expect(resolveGatewayRequest("zai/glm-5.3-flash", "sess-gw")).toBeUndefined();
	});

	it("returns undefined when payload.model is missing", () => {
		expect(resolveGatewayRequest({ stream: true }, "sess-gw")).toBeUndefined();
	});

	it("returns undefined when payload.model is not a string", () => {
		expect(resolveGatewayRequest({ model: 42 }, "sess-gw")).toBeUndefined();
	});

	it("leaves other providers' models untouched", () => {
		expect(resolveGatewayRequest({ model: "gpt-4o", stream: true }, "sess-gw")).toBeUndefined();
		expect(resolveGatewayRequest({ model: "particle/deepseek-v4.1-flash" }, "sess-gw")).toBeUndefined();
	});

	it("returns undefined when the payload already carries a key", () => {
		expect(
			resolveGatewayRequest({ model: "deepseek/deepseek-v4-flash-0731", prompt_cache_key: "pi-key" }, "sess-gw"),
		).toBeUndefined();
	});

	it("returns undefined when the session id is missing or empty", () => {
		expect(resolveGatewayRequest({ model: "zai/glm-5.3-flash" })).toBeUndefined();
		expect(resolveGatewayRequest({ model: "zai/glm-5.3-flash" }, "")).toBeUndefined();
	});
});
