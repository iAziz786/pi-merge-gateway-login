import { describe, it, expect } from "bun:test";
import registerExtension from "./index.ts";
import { priceTurnAtVendor, resolveGatewayRequest } from "./index.ts";
import { indexCatalog, parseCatalog } from "./catalog.ts";

/** Live-shaped catalog page: two vendors, one retired-id alias, one rate card each. */
const CATALOG = {
	object: "list",
	has_more: false,
	data: [
		{
			model: "deepseek/deepseek-v4.1-flash",
			display_name: "DeepSeek V4.1 Flash",
			aliases: [{ model: "deepseek/deepseek-v4-flash" }],
			vendors: {
				deepseek: {
					context_window: 1_000_000,
					max_output_tokens: 384_000,
					capabilities: {
						input: ["text"],
						output: ["text", "tool_use"],
						supports_reasoning: true,
						reasoning: { configurable: true, effort_values: ["none", "low", "medium", "high", "max"] },
					},
					pricing: {
						input_per_million: 0.15,
						output_per_million: 0.6,
						cache_read_per_million: 0.003,
						schedule: [
							{
								name: "peak",
								timezone: "UTC",
								days: ["mon", "tue", "wed", "thu", "fri"],
								windows: [{ start: "01:00", end: "04:00" }],
								input_per_million: 0.3,
								output_per_million: 1.2,
								cache_read_per_million: 0.006,
							},
						],
					},
				},
				particle: {
					context_window: 1_000_000,
					max_output_tokens: 384_000,
					capabilities: { input: ["text", "image"], output: ["text", "tool_use"], supports_reasoning: true },
					pricing: { input_per_million: 0.2, output_per_million: 0.8, cache_read_per_million: 0.03 },
				},
			},
		},
		{
			model: "zai/glm-5.3-flash",
			display_name: "GLM 5.3 Flash",
			aliases: [],
			vendors: {
				particle: {
					context_window: 1_000_000,
					max_output_tokens: 131_000,
					capabilities: { input: ["text", "image"], output: ["text", "tool_use"], supports_reasoning: true },
					pricing: { input_per_million: 0.015, output_per_million: 0.05, cache_read_per_million: 0.003 },
				},
			},
		},
	],
};

const FALLBACK_IDS = [
	"zai/glm-5.3-flash",
	"deepseek/deepseek-v4-flash",
	"deepseek/deepseek-v4-flash-0731",
	"deepseek/deepseek-v4.1-flash",
];

type Handler = (event: never, ctx: never) => void;

async function captureConfig(env?: string, deps: { fetch?: typeof fetch } = {}) {
	const prev = process.env.MERGE_GATEWAY_API_KEY;
	if (env === undefined) delete process.env.MERGE_GATEWAY_API_KEY;
	else process.env.MERGE_GATEWAY_API_KEY = env;
	try {
		const configs: Record<string, Record<string, unknown>> = {};
		const handlers: Record<string, Handler[]> = {};
		const pi = {
			registerProvider: (id: string, config: Record<string, unknown>) => {
				configs[id] = config;
			},
			on: (event: string, handler: Handler) => {
				(handlers[event] ??= []).push(handler);
			},
		};
		await registerExtension(pi as never, { fetch: offlineFetch, ...deps });
		return { configs, handlers };
	} finally {
		if (prev === undefined) delete process.env.MERGE_GATEWAY_API_KEY;
		else process.env.MERGE_GATEWAY_API_KEY = prev;
	}
}

/** Tests never hit the network: the catalog is either refused or stubbed. */
const offlineFetch = (async () => {
	throw new Error("offline");
}) as unknown as typeof fetch;

const catalogFetch = (async () =>
	({ ok: true, status: 200, json: async () => CATALOG }) as unknown as Response) as unknown as typeof fetch;

describe("provider registration", () => {
	it("registers under the merge-gateway id", async () => {
		expect(Object.keys((await captureConfig("mg__test")).configs)).toEqual(["merge-gateway"]);
	});

	it("passes the env var name so host resolves it", async () => {
		expect((await captureConfig("mg__test_env_key")).configs["merge-gateway"]?.["apiKey"]).toBe(
			"MERGE_GATEWAY_API_KEY",
		);
	});

	it("keeps apiKey declared when env is missing (host falls back to stored login)", async () => {
		expect((await captureConfig()).configs["merge-gateway"]?.["apiKey"]).toBe("MERGE_GATEWAY_API_KEY");
	});

	it("registers the gateway catalog when it answers", async () => {
		const { configs } = await captureConfig("mg__cat", { fetch: catalogFetch });
		const models = configs["merge-gateway"]?.["models"] as { id: string; cost: { input: number } }[];
		expect(models.map((model) => model.id)).toEqual(["deepseek/deepseek-v4.1-flash", "zai/glm-5.3-flash"]);
		expect(models[0]?.cost.input).toBe(0.15);
	});

	it("falls back to the bundled models when the catalog is unreachable", async () => {
		const { configs } = await captureConfig("mg__offline");
		const models = configs["merge-gateway"]?.["models"] as { id: string }[];
		expect(models.map((model) => model.id)).toEqual(FALLBACK_IDS);
	});

	it("does not reach the gateway without a key", async () => {
		let called = 0;
		await captureConfig(undefined, {
			fetch: (async () => {
				called += 1;
				return { ok: false, status: 401 } as unknown as Response;
			}) as unknown as typeof fetch,
		});
		expect(called).toBe(0);
	});
});

describe("pricing hook", () => {
	async function modelAfterResponse(vendor: string, id = "deepseek/deepseek-v4.1-flash") {
		const { handlers } = await captureConfig("mg__price", { fetch: catalogFetch });
		const handler = handlers["after_provider_response"]?.[0];
		if (!handler) throw new Error("after_provider_response not registered");
		const model = {
			id,
			provider: "merge-gateway",
			cost: { input: 1, output: 1, cacheRead: 1, cacheWrite: 1 },
		};
		handler({ headers: { "x-merge-vendor": vendor } } as never, { model } as never);
		return model.cost;
	}

	it("reprices the model at the vendor that served the response", async () => {
		expect(await modelAfterResponse("particle")).toEqual({
			input: 0.2,
			output: 0.8,
			cacheRead: 0.03,
			cacheWrite: 0,
		});
	});

	it("leaves the card alone for a vendor the catalog does not list", async () => {
		expect(await modelAfterResponse("unknown-vendor")).toEqual({
			input: 1,
			output: 1,
			cacheRead: 1,
			cacheWrite: 1,
		});
	});

	it("ignores other providers' responses", async () => {
		const { handlers } = await captureConfig("mg__price_other", { fetch: catalogFetch });
		const handler = handlers["after_provider_response"]?.[0];
		const model = {
			id: "deepseek/deepseek-v4.1-flash",
			provider: "opencode-go",
			cost: { input: 1, output: 1, cacheRead: 1, cacheWrite: 1 },
		};
		handler?.({ headers: { "x-merge-vendor": "particle" } } as never, { model } as never);
		expect(model.cost.input).toBe(1);
	});
});

describe("priceTurnAtVendor", () => {
	const index = indexCatalog(parseCatalog(CATALOG));
	const card = () => ({ input: 1, output: 1, cacheRead: 1, cacheWrite: 1 });

	it("follows the catalog's alias table for a retired id", () => {
		const model = { id: "deepseek/deepseek-v4-flash", cost: card() };
		expect(priceTurnAtVendor(model, "deepseek", index, Date.UTC(2026, 8, 20, 2, 0))).toBe(true);
		expect(model.cost.input).toBe(0.15);
	});

	it("applies the vendor's peak window when the turn falls inside one", () => {
		const inPeak = { id: "deepseek/deepseek-v4.1-flash", cost: card() };
		expect(priceTurnAtVendor(inPeak, "deepseek", index, Date.UTC(2026, 8, 22, 2, 0))).toBe(true);
		expect(inPeak.cost.input).toBe(0.3);

		const offPeak = { id: "deepseek/deepseek-v4.1-flash", cost: card() };
		expect(priceTurnAtVendor(offPeak, "deepseek", index, Date.UTC(2026, 8, 22, 5, 0))).toBe(true);
		expect(offPeak.cost.input).toBe(0.15);
	});

	it("reports false and leaves the card untouched for an unknown vendor", () => {
		const model = { id: "zai/glm-5.3-flash", cost: card() };
		expect(priceTurnAtVendor(model, "modal", index, Date.now())).toBe(false);
		expect(model.cost.input).toBe(1);
	});
});

describe("oauth login", () => {
	async function getLogin() {
		const oauth = (await captureConfig()).configs["merge-gateway"]?.["oauth"] as
			| { name: string; login: (callbacks: Record<string, unknown>) => Promise<string> }
			| undefined;
		if (typeof oauth?.login !== "function") throw new Error("oauth.login not registered");
		return oauth;
	}

	it("registers oauth for /login support", async () => {
		expect((await getLogin()).name).toBe("Merge Dev");
	});

	it("returns the trimmed key after validation", async () => {
		const seen: { url: unknown; authorization: unknown }[] = [];
		const key = await (await getLogin()).login({
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
			(await getLogin()).login({
				onPrompt: async () => "mg__bad",
				onAuth: () => {},
				fetch: (async () => ({ ok: false, status: 401 })) as never,
			} as never),
		).rejects.toThrow("401");
	});

	it("throws on empty input without validating", async () => {
		let fetched = false;
		await expect(
			(await getLogin()).login({
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
