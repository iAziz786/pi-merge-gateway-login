import { describe, it, expect } from "bun:test";
import {
	chatModels,
	indexCatalog,
	parseCatalog,
	preferredVendor,
	ratesFor,
	resolveModel,
	toModelEntry,
} from "./catalog.ts";

// Shapes copied from live `GET /v1/models` payloads: per-vendor pricing,
// DeepSeek's peak schedule, aliases, and the non-chat models the catalog also
// lists (video, image) so the filter is exercised.
const PAYLOAD = {
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
					availability_status: "available",
					zero_data_retention: false,
					capabilities: {
						input: ["text"],
						supports_reasoning: true,
						reasoning: {
							configurable: true,
							effort_values: ["none", "minimal", "low", "medium", "high", "xhigh", "max"],
						},
						output: ["text", "tool_use"],
					},
					pricing: {
						input_per_million: 0.15,
						output_per_million: 0.6,
						cache_read_per_million: 0.003,
						cache_write_per_million: null,
						schedule: [
							{
								name: "peak",
								timezone: "UTC",
								days: ["mon", "tue", "wed", "thu", "fri"],
								windows: [
									{ start: "01:00", end: "04:00" },
									{ start: "06:00", end: "10:00" },
								],
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
					capabilities: { input: ["text", "image"], supports_reasoning: true, output: ["text", "tool_use"] },
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
					capabilities: {
						input: ["text", "image"],
						supports_reasoning: true,
						reasoning: { configurable: true, effort_values: ["low", "high", "max"] },
						output: ["text", "tool_use"],
					},
					pricing: { input_per_million: 0.015, output_per_million: 0.05, cache_read_per_million: 0.003 },
				},
			},
		},
		{
			model: "bytedance/seedance-2.5-text-to-video",
			display_name: "Seedance 2.5",
			aliases: [],
			vendors: {
				fal: {
					context_window: 4096,
					max_output_tokens: 4096,
					capabilities: { input: ["text"], supports_reasoning: false, output: ["video"] },
					pricing: { input_per_million: 0.1, output_per_million: 0.1 },
				},
			},
		},
		{ model: "broken/model", display_name: "No vendors", aliases: [], vendors: {} },
		"not-an-object",
	],
};

const MODELS = parseCatalog(PAYLOAD);
const INDEX = indexCatalog(MODELS);

describe("parseCatalog", () => {
	it("keeps the models the gateway describes and drops malformed entries", () => {
		expect(MODELS.map((model) => model.id)).toEqual([
			"deepseek/deepseek-v4.1-flash",
			"zai/glm-5.3-flash",
			"bytedance/seedance-2.5-text-to-video",
		]);
	});

	it("reads per-vendor rates, with a missing cache rate as zero", () => {
		const deepseek = MODELS[0]?.vendors.find((vendor) => vendor.vendor === "deepseek");
		expect(deepseek?.rates).toEqual({ input: 0.15, output: 0.6, cacheRead: 0.003, cacheWrite: 0 });
	});

	it("parses the peak schedule into zone-local minutes and Sunday-0 weekdays", () => {
		expect(MODELS[0]?.vendors.find((vendor) => vendor.vendor === "deepseek")?.peak).toEqual({
			timeZone: "UTC",
			windows: [
				{ weekdays: [1, 2, 3, 4, 5], startMinute: 60, endMinute: 240 },
				{ weekdays: [1, 2, 3, 4, 5], startMinute: 360, endMinute: 600 },
			],
			rates: { input: 0.3, output: 1.2, cacheRead: 0.006, cacheWrite: 0 },
		});
	});

	it("keeps only the input modalities pi accepts", () => {
		const particle = MODELS[0]?.vendors.find((vendor) => vendor.vendor === "particle");
		expect(particle?.input).toEqual(["text", "image"]);
	});
});

describe("chatModels", () => {
	it("drops models that only produce video", () => {
		expect(chatModels(MODELS).map((model) => model.id)).toEqual([
			"deepseek/deepseek-v4.1-flash",
			"zai/glm-5.3-flash",
		]);
	});
});

describe("preferredVendor", () => {
	it("picks the cheapest input rate", () => {
		expect(preferredVendor(MODELS[0]!)?.vendor).toBe("deepseek");
	});
});

describe("ratesFor", () => {
	const deepseek = MODELS[0]!.vendors.find((vendor) => vendor.vendor === "deepseek")!;
	it("doubles inside the weekday peak windows", () => {
		// Tuesday 2026-09-22, 02:00 UTC — inside 01:00-04:00.
		expect(ratesFor(deepseek, Date.UTC(2026, 8, 22, 2, 0))).toEqual({
			input: 0.3,
			output: 1.2,
			cacheRead: 0.006,
			cacheWrite: 0,
		});
	});

	it("leaves the base rates outside them", () => {
		// Sunday 02:00 UTC, and Tuesday 05:00 UTC (between the two windows).
		for (const atMs of [Date.UTC(2026, 8, 20, 2, 0), Date.UTC(2026, 8, 22, 5, 0)]) {
			expect(ratesFor(deepseek, atMs)).toEqual({
				input: 0.15,
				output: 0.6,
				cacheRead: 0.003,
				cacheWrite: 0,
			});
		}
	});
});

// deepseek/deepseek-v4.1-flash-1017 as the live gateway serves it: the peak
// schedule is in New York time and names no days, meaning every day.
const NEW_YORK_PEAK_MODEL = parseCatalog({
	data: [
		{
			model: "deepseek/deepseek-v4.1-flash-1017",
			display_name: "DeepSeek V4.1 Flash 1017",
			aliases: [],
			vendors: {
				particle: {
					context_window: 1_000_000,
					max_output_tokens: 384_000,
					capabilities: { input: ["text", "image"], supports_reasoning: true, output: ["text", "tool_use"] },
					pricing: {
						input_per_million: 0.15,
						output_per_million: 0.6,
						cache_read_per_million: 0.003,
						schedule: [
							{
								name: "peak",
								timezone: "America/New_York",
								days: null,
								windows: [{ start: "04:00", end: "20:30" }],
								input_per_million: 0.3,
								output_per_million: 1.2,
								cache_read_per_million: 0.006,
								cache_write_per_million: null,
							},
						],
					},
				},
			},
		},
	],
})[0]!.vendors[0]!;

describe("ratesFor with a non-UTC schedule", () => {
	const base = { input: 0.15, output: 0.6, cacheRead: 0.003, cacheWrite: 0 };
	const peak = { input: 0.3, output: 1.2, cacheRead: 0.006, cacheWrite: 0 };

	it("opens and closes the window on New York wall-clock time in summer (UTC-4)", () => {
		expect(ratesFor(NEW_YORK_PEAK_MODEL, Date.UTC(2026, 9, 20, 7, 59))).toEqual(base); // 03:59 EDT
		expect(ratesFor(NEW_YORK_PEAK_MODEL, Date.UTC(2026, 9, 20, 8, 0))).toEqual(peak); // 04:00 EDT
		expect(ratesFor(NEW_YORK_PEAK_MODEL, Date.UTC(2026, 9, 21, 0, 29))).toEqual(peak); // 20:29 EDT
		expect(ratesFor(NEW_YORK_PEAK_MODEL, Date.UTC(2026, 9, 21, 0, 30))).toEqual(base); // 20:30 EDT
	});

	it("follows daylight saving: the same window sits an hour later in UTC in winter (UTC-5)", () => {
		expect(ratesFor(NEW_YORK_PEAK_MODEL, Date.UTC(2026, 11, 15, 8, 59))).toEqual(base); // 03:59 EST
		expect(ratesFor(NEW_YORK_PEAK_MODEL, Date.UTC(2026, 11, 15, 9, 0))).toEqual(peak); // 04:00 EST
	});

	it("applies on every day when the schedule names none", () => {
		expect(ratesFor(NEW_YORK_PEAK_MODEL, Date.UTC(2026, 9, 18, 12, 0))).toEqual(peak); // Sunday
		expect(ratesFor(NEW_YORK_PEAK_MODEL, Date.UTC(2026, 9, 17, 12, 0))).toEqual(peak); // Saturday
	});

	it("uses the New York weekday, not the UTC one, for a day-limited schedule", () => {
		const weekdayOnly = parseCatalog({
			data: [
				{
					model: "x/y",
					vendors: {
						v: {
							context_window: 1,
							max_output_tokens: 1,
							capabilities: { input: ["text"], output: ["text"] },
							pricing: {
								input_per_million: 1,
								output_per_million: 1,
								schedule: [
									{
										timezone: "America/New_York",
										days: ["mon"],
										windows: [{ start: "20:00", end: "23:00" }],
										input_per_million: 2,
										output_per_million: 2,
									},
								],
							},
						},
					},
				},
			],
		})[0]!.vendors[0]!;
		// Monday 20:30 EDT is Tuesday 00:30 UTC: inside Monday's window.
		expect(ratesFor(weekdayOnly, Date.UTC(2026, 9, 20, 0, 30)).input).toBe(2);
		// Tuesday 20:30 EDT is Wednesday 00:30 UTC: in the window's hours, but the wrong day.
		expect(ratesFor(weekdayOnly, Date.UTC(2026, 9, 21, 0, 30)).input).toBe(1);
	});

	it("ignores a schedule whose timezone is not a valid zone", () => {
		const bad = parseCatalog({
			data: [
				{
					model: "x/y",
					vendors: {
						v: {
							context_window: 1,
							max_output_tokens: 1,
							capabilities: { input: ["text"], output: ["text"] },
							pricing: {
								input_per_million: 1,
								output_per_million: 1,
								schedule: [
									{ timezone: "Mars/Olympus", windows: [{ start: "00:00", end: "23:00" }], input_per_million: 2, output_per_million: 2 },
								],
							},
						},
					},
				},
			],
		})[0]!.vendors[0]!;
		expect(bad.peak).toBeUndefined();
	});
});

describe("resolveModel", () => {
	it("resolves a canonical id", () => {
		expect(resolveModel(INDEX, "zai/glm-5.3-flash")?.displayName).toBe("GLM 5.3 Flash");
	});

	it("resolves an id the catalog lists as an alias of another model", () => {
		expect(resolveModel(INDEX, "deepseek/deepseek-v4-flash")?.id).toBe("deepseek/deepseek-v4.1-flash");
	});

	it("returns undefined for an unknown id", () => {
		expect(resolveModel(INDEX, "nope/nope")).toBeUndefined();
	});
});

describe("toModelEntry", () => {
	it("folds pi's thinking ladder onto the values the vendor accepts", () => {
		const glm = toModelEntry(MODELS[1]!, MODELS[1]!.vendors[0]!);
		expect(glm.thinkingLevelMap).toEqual({
			off: null,
			minimal: "low",
			low: "low",
			medium: "high",
			high: "high",
			xhigh: "max",
			max: "max",
		});
		expect(glm.compat.supportsReasoningEffort).toBe(true);
	});

	it("maps an explicit none to the off level", () => {
		const deepseek = toModelEntry(MODELS[0]!, MODELS[0]!.vendors[0]!);
		expect(deepseek.thinkingLevelMap?.off).toBe("none");
		expect(deepseek.thinkingLevelMap?.max).toBe("max");
	});

	it("carries the vendor's limits and the preferred card", () => {
		const deepseek = toModelEntry(MODELS[0]!, preferredVendor(MODELS[0]!)!);
		expect(deepseek.contextWindow).toBe(1_000_000);
		expect(deepseek.maxTokens).toBe(384_000);
		expect(deepseek.cost).toEqual({ input: 0.15, output: 0.6, cacheRead: 0.003, cacheWrite: 0 });
	});

	it("leaves the effort map out when the vendor lists no effort values", () => {
		const video = MODELS[2]!.vendors[0]!;
		const entry = toModelEntry(MODELS[2]!, video);
		expect(entry.thinkingLevelMap).toBeUndefined();
		expect(entry.compat.supportsReasoningEffort).toBe(false);
		expect(entry.reasoning).toBe(false);
	});
});
