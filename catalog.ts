/**
 * Merge Dev gateway catalog (`GET /v1/models`) → pi provider model entries and
 * per-vendor rates.
 *
 * The gateway routes every request to the cheapest eligible vendor of the model
 * and fails over to the next when that vendor cannot take it, so a pi model
 * entry cannot carry one vendor's rates and stay right. Two halves handle that:
 *
 * - Entries below carry the *preferred* vendor's base rates as a fallback, which
 *   is what pi shows before the first response of a turn is priced.
 * - `index.ts` rewrites `ctx.model.cost` from the response's `x-merge-vendor`
 *   header inside `after_provider_response` — before the stream is consumed and
 *   therefore before pricing runs — so a turn is billed at the vendor that
 *   actually served it, peak windows included.
 *
 * Parsing is strict at the boundary: the payload is external input, so every
 * field is validated once here and the rest of the code consumes typed values.
 */

export const CATALOG_URL = "https://api-gateway.merge.dev/v1/models";

/** Per-1M-token USD rates for one vendor. */
export interface VendorRates {
	input: number;
	output: number;
	cacheRead: number;
	cacheWrite: number;
}

/** A recurring UTC peak interval: weekdays use Sunday = 0, the end is exclusive. */
export interface PeakWindow {
	weekdays: number[];
	startMinute: number;
	endMinute: number;
}

/** Peak-window rates that replace the vendor's base rates inside `windows`. */
export interface PeakSchedule {
	windows: PeakWindow[];
	rates: VendorRates;
}

export interface VendorEntry {
	vendor: string;
	/** Base (off-peak) rates. */
	rates: VendorRates;
	peak?: PeakSchedule;
	contextWindow: number;
	maxOutputTokens: number;
	input: ("text" | "image")[];
	output: string[];
	reasoning: boolean;
	effortValues: string[];
}

export interface CatalogModel {
	id: string;
	displayName: string;
	aliases: string[];
	vendors: VendorEntry[];
}

/** Lookup by model id, then by any id the catalog lists as an alias of it. */
export interface CatalogIndex {
	byId: Map<string, CatalogModel>;
	byAlias: Map<string, CatalogModel>;
}

/** The pi-side entry shape this module produces (a subset of ProviderModelConfig). */
export interface ModelEntry {
	id: string;
	name: string;
	reasoning: boolean;
	input: ("text" | "image")[];
	contextWindow: number;
	maxTokens: number;
	cost: VendorRates;
	thinkingLevelMap?: Partial<Record<"off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max", string | null>>;
	compat: {
		thinkingFormat: "openai";
		supportsReasoningEffort: boolean;
		sessionAffinityFormat: "openrouter";
	};
}

const WEEKDAYS: Record<string, number> = {
	sun: 0,
	mon: 1,
	tue: 2,
	wed: 3,
	thu: 4,
	fri: 5,
	sat: 6,
};
/** pi's thinking ladder, lowest first; provider values fold onto it. */
const PI_LEVELS = ["minimal", "low", "medium", "high", "xhigh", "max"] as const;

function record(value: unknown): Record<string, unknown> | undefined {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function text(value: unknown): string | undefined {
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

function stringList(value: unknown): string[] {
	return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

/** "01:30" → 90 minutes past UTC midnight. */
function minute(text0: string): number | undefined {
	const match = /^(\d{1,2}):(\d{2})$/.exec(text0);
	if (!match) return undefined;
	const hours = Number(match[1]);
	const minutes = Number(match[2]);
	return hours < 24 && minutes < 60 ? hours * 60 + minutes : undefined;
}

function parseRates(pricing: Record<string, unknown>): VendorRates {
	const perMillion = (key: string): number => {
		const value = pricing[key];
		return typeof value === "number" && Number.isFinite(value) ? value : 0;
	};
	return {
		input: perMillion("input_per_million"),
		output: perMillion("output_per_million"),
		cacheRead: perMillion("cache_read_per_million"),
		cacheWrite: perMillion("cache_write_per_million"),
	};
}

function parseSchedule(pricing: Record<string, unknown>): PeakSchedule | undefined {
	const schedules = Array.isArray(pricing.schedule) ? pricing.schedule : [];
	for (const candidate of schedules) {
		const entry = record(candidate);
		if (!entry || text(entry.timezone) !== "UTC") continue;
		// The gateway puts the weekdays on the schedule and the clock windows on
		// its entries: `{ days: ["mon", …], windows: [{ start, end }] }`.
		const weekdays = stringList(entry.days)
			.map((day) => WEEKDAYS[day.toLowerCase()])
			.filter((day): day is number => day !== undefined);
		if (weekdays.length === 0) continue;
		const windows: PeakWindow[] = [];
		for (const raw of Array.isArray(entry.windows) ? entry.windows : []) {
			const window = record(raw);
			if (!window) continue;
			const start = minute(text(window.start) ?? "");
			const end = minute(text(window.end) ?? "");
			if (start === undefined || end === undefined) continue;
			windows.push({ weekdays, startMinute: start, endMinute: end });
		}
		if (windows.length > 0) return { windows, rates: parseRates(entry) };
	}
	return undefined;
}

function parseVendor(vendor: string, raw: unknown): VendorEntry | undefined {
	const entry = record(raw);
	const pricing = record(entry?.pricing);
	const capabilities = record(entry?.capabilities);
	if (!entry || !pricing || !capabilities) return undefined;
	const contextWindow = entry.context_window;
	const maxOutputTokens = entry.max_output_tokens;
	if (
		typeof contextWindow !== "number" ||
		!Number.isFinite(contextWindow) ||
		contextWindow <= 0 ||
		typeof maxOutputTokens !== "number" ||
		!Number.isFinite(maxOutputTokens) ||
		maxOutputTokens <= 0
	)
		return undefined;
	const reasoning = record(capabilities.reasoning);
	return {
		vendor,
		rates: parseRates(pricing),
		peak: parseSchedule(pricing),
		contextWindow,
		maxOutputTokens,
		input: stringList(capabilities.input).filter((kind): kind is "text" | "image" => kind === "text" || kind === "image"),
		output: stringList(capabilities.output),
		reasoning: capabilities.supports_reasoning === true,
		effortValues: stringList(reasoning?.effort_values),
	};
}

/** Validate one catalog payload page; unknown shapes are skipped, never guessed. */
export function parseCatalog(payload: unknown): CatalogModel[] {
	const root = record(payload);
	const data = root && Array.isArray(root.data) ? root.data : [];
	const models: CatalogModel[] = [];
	for (const raw of data) {
		const entry = record(raw);
		const id = text(entry?.model);
		const vendors = record(entry?.vendors);
		if (!entry || !id || !vendors) continue;
		const parsed: VendorEntry[] = [];
		for (const [vendor, value] of Object.entries(vendors)) {
			const parsedVendor = parseVendor(vendor, value);
			if (parsedVendor) parsed.push(parsedVendor);
		}
		if (parsed.length === 0) continue;
		models.push({
			id,
			displayName: text(entry.display_name) ?? id,
			// Aliases are objects (`[{ model, type, description }]`), not strings.
			aliases: (Array.isArray(entry.aliases) ? entry.aliases : [])
				.map((alias) => text(record(alias)?.model))
				.filter((alias): alias is string => alias !== undefined),
			vendors: parsed,
		});
	}
	return models;
}

export function indexCatalog(models: readonly CatalogModel[]): CatalogIndex {
	const byId = new Map<string, CatalogModel>();
	const byAlias = new Map<string, CatalogModel>();
	for (const model of models) {
		byId.set(model.id, model);
		for (const alias of model.aliases) byAlias.set(alias, model);
	}
	return { byId, byAlias };
}

/** Catalog entry for a pi model id, following the catalog's own alias table. */
export function resolveModel(index: CatalogIndex, id: string): CatalogModel | undefined {
	return index.byId.get(id) ?? index.byAlias.get(id);
}

/** Models usable as chat models over the Responses API. */
export function chatModels(models: readonly CatalogModel[]): CatalogModel[] {
	return models.filter((model) =>
		model.vendors.some(
			(vendor) =>
				vendor.input.includes("text") &&
				vendor.output.includes("text") &&
				vendor.rates.input > 0 &&
				vendor.rates.output > 0,
		),
	);
}

/** The vendor the gateway prefers: cheapest input, then cheapest output. */
export function preferredVendor(model: CatalogModel): VendorEntry | undefined {
	return [...model.vendors].sort(
		(a, b) => a.rates.input - b.rates.input || a.rates.output - b.rates.output || a.vendor.localeCompare(b.vendor),
	)[0];
}

/** Rounded-up fold of pi's thinking ladder onto the values a vendor accepts. */
function thinkingLevelMap(effortValues: readonly string[]): ModelEntry["thinkingLevelMap"] {
	if (effortValues.length === 0) return undefined;
	const known = effortValues
		.map((value) => ({ value, rank: PI_LEVELS.indexOf(value as (typeof PI_LEVELS)[number]) }))
		.filter((entry) => entry.rank >= 0);
	if (known.length === 0) return undefined;
	const nearest = (rank: number): string =>
		known.reduce((best, entry) => {
			const distance = Math.abs(entry.rank - rank);
			const bestDistance = Math.abs(best.rank - rank);
			return distance < bestDistance || (distance === bestDistance && entry.rank > best.rank) ? entry : best;
		}).value;
	const map: NonNullable<ModelEntry["thinkingLevelMap"]> = {
		off: effortValues.includes("none") ? "none" : null,
	};
	for (const [rank, level] of PI_LEVELS.entries()) map[level] = nearest(rank);
	return map;
}

/** pi entry for a catalog model, priced at `vendor` (the preferred one by default). */
export function toModelEntry(model: CatalogModel, vendor: VendorEntry): ModelEntry {
	return {
		id: model.id,
		name: model.displayName,
		reasoning: vendor.reasoning,
		input: vendor.input.length > 0 ? vendor.input : ["text"],
		contextWindow: vendor.contextWindow,
		maxTokens: vendor.maxOutputTokens,
		cost: { ...vendor.rates },
		thinkingLevelMap: thinkingLevelMap(vendor.effortValues),
		compat: {
			thinkingFormat: "openai",
			supportsReasoningEffort: vendor.effortValues.length > 0,
			sessionAffinityFormat: "openrouter",
		},
	};
}

/** Is `atMs` inside one of the vendor's peak windows? */
export function isPeak(vendor: VendorEntry, atMs: number): boolean {
	const schedule = vendor.peak;
	if (!schedule) return false;
	const day = Math.floor(atMs / 86_400_000);
	const weekday = (((day + 4) % 7) + 7) % 7;
	const minuteOfDay = Math.floor((atMs - day * 86_400_000) / 60_000);
	return schedule.windows.some(
		(window) =>
			window.weekdays.includes(weekday) && minuteOfDay >= window.startMinute && minuteOfDay < window.endMinute,
	);
}

/** Rates in effect for a vendor at a moment, following its peak schedule. */
export function ratesFor(vendor: VendorEntry, atMs: number): VendorRates {
	return vendor.peak && isPeak(vendor, atMs) ? vendor.peak.rates : vendor.rates;
}

/** Fetch every page of the catalog; throws on a non-OK response. */
export async function fetchCatalog(apiKey: string, fetchImpl: typeof fetch = fetch): Promise<CatalogModel[]> {
	const models: CatalogModel[] = [];
	let cursor: string | undefined;
	do {
		const url = new URL(CATALOG_URL);
		url.searchParams.set("limit", "100");
		if (cursor) url.searchParams.set("cursor", cursor);
		const response = await fetchImpl(url, { headers: { Authorization: `Bearer ${apiKey}` } });
		if (!response.ok) throw new Error(`catalog fetch failed: ${response.status}`);
		const payload: unknown = await response.json();
		models.push(...parseCatalog(payload));
		const root = record(payload);
		const next = text(root?.next_cursor);
		cursor = root?.has_more === true ? next : undefined;
	} while (cursor);
	return models;
}
