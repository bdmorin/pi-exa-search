import {
	DEFAULT_HIGHLIGHTS_MAX_CHARACTERS,
	DEFAULT_NUM_RESULTS,
	MAX_HIGHLIGHTS_MAX_CHARACTERS,
	MAX_NUM_RESULTS,
	MIN_HIGHLIGHTS_MAX_CHARACTERS,
} from "./constants.js";
import { ValidationError } from "./errors.js";
import type { EffectiveSearchParams, RawToolParams } from "./types.js";

function unique(values: string[]): string[] {
	return [...new Set(values)];
}

function normalizeQueryList(query?: string, queries?: string[]): string[] {
	if (query && queries) {
		throw new ValidationError("query_conflict", "Provide either query or queries, not both.");
	}

	const rawValues = query ? [query] : (queries ?? []);
	const normalized = unique(rawValues.map((value) => value.trim()).filter(Boolean));
	if (normalized.length === 0) {
		throw new ValidationError("missing_query", "Provide query or queries with at least one non-empty search string.");
	}
	return normalized;
}

function normalizeDomainValue(raw: string): string {
	const trimmed = raw.trim();
	if (!trimmed) {
		throw new ValidationError("invalid_domain", "Domain filters cannot contain empty values.");
	}

	const withoutPrefix = trimmed.startsWith("-") ? trimmed.slice(1) : trimmed;
	const candidate =
		withoutPrefix.startsWith("http://") || withoutPrefix.startsWith("https://")
			? new URL(withoutPrefix).hostname
			: withoutPrefix.split("/")[0];
	const normalized = candidate.toLowerCase().replace(/^www\./, "");

	if (!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(normalized)) {
		throw new ValidationError("invalid_domain", `Invalid domain filter: ${raw}`);
	}

	return normalized;
}

function mergeDomains(raw: RawToolParams): { includeDomains: string[]; excludeDomains: string[] } {
	const includeDomains = [...(raw.includeDomains ?? [])];
	const excludeDomains = [...(raw.excludeDomains ?? [])];

	for (const entry of raw.domainFilter ?? []) {
		const trimmed = entry.trim();
		if (!trimmed) continue;
		if (trimmed.startsWith("-")) excludeDomains.push(trimmed.slice(1));
		else includeDomains.push(trimmed);
	}

	const normalizedIncludes = unique(includeDomains.map(normalizeDomainValue));
	const normalizedExcludes = unique(excludeDomains.map(normalizeDomainValue));
	const conflicts = normalizedIncludes.filter((domain) => normalizedExcludes.includes(domain));
	if (conflicts.length > 0) {
		throw new ValidationError(
			"domain_conflict",
			`The same domain cannot be both included and excluded: ${conflicts.join(", ")}`,
		);
	}

	return { includeDomains: normalizedIncludes, excludeDomains: normalizedExcludes };
}

function normalizeDate(value: string, bound: "start" | "end"): string {
	if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		const [year, month, day] = value.split("-").map(Number);
		const date =
			bound === "start"
				? new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
				: new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
		return date.toISOString();
	}

	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		throw new ValidationError("invalid_date", `Invalid ${bound}PublishedDate: ${value}`);
	}
	return parsed.toISOString();
}

function recencyStartDate(now: Date, recencyFilter: NonNullable<RawToolParams["recencyFilter"]>): string {
	const date = new Date(now.getTime());
	if (recencyFilter === "day") date.setUTCDate(date.getUTCDate() - 1);
	if (recencyFilter === "week") date.setUTCDate(date.getUTCDate() - 7);
	if (recencyFilter === "month") date.setUTCMonth(date.getUTCMonth() - 1);
	if (recencyFilter === "year") date.setUTCFullYear(date.getUTCFullYear() - 1);
	return date.toISOString();
}

export function normalizeToolParams(raw: RawToolParams, options?: { now?: () => Date }): EffectiveSearchParams {
	if (raw.recencyFilter && (raw.startPublishedDate || raw.endPublishedDate)) {
		throw new ValidationError(
			"mixed_date_filters",
			"Use either recencyFilter or explicit published date bounds, not both.",
		);
	}

	const queries = normalizeQueryList(raw.query, raw.queries);
	const { includeDomains, excludeDomains } = mergeDomains(raw);
	const numResults = raw.numResults ?? DEFAULT_NUM_RESULTS;
	const highlightsMaxCharacters = raw.highlightsMaxCharacters ?? DEFAULT_HIGHLIGHTS_MAX_CHARACTERS;
	if (!Number.isInteger(numResults) || numResults < 1 || numResults > MAX_NUM_RESULTS) {
		throw new ValidationError(
			"invalid_num_results",
			`numResults must be an integer between 1 and ${MAX_NUM_RESULTS}.`,
		);
	}
	if (
		!Number.isInteger(highlightsMaxCharacters) ||
		highlightsMaxCharacters < MIN_HIGHLIGHTS_MAX_CHARACTERS ||
		highlightsMaxCharacters > MAX_HIGHLIGHTS_MAX_CHARACTERS
	) {
		throw new ValidationError(
			"invalid_highlights_max_characters",
			`highlightsMaxCharacters must be an integer between ${MIN_HIGHLIGHTS_MAX_CHARACTERS} and ${MAX_HIGHLIGHTS_MAX_CHARACTERS}.`,
		);
	}

	const now = options?.now?.() ?? new Date();
	const startPublishedDate = raw.startPublishedDate
		? normalizeDate(raw.startPublishedDate, "start")
		: raw.recencyFilter
			? recencyStartDate(now, raw.recencyFilter)
			: undefined;
	const endPublishedDate = raw.endPublishedDate ? normalizeDate(raw.endPublishedDate, "end") : undefined;

	if (startPublishedDate && endPublishedDate && startPublishedDate > endPublishedDate) {
		throw new ValidationError(
			"invalid_date_range",
			"startPublishedDate must be before or equal to endPublishedDate.",
		);
	}

	return {
		queries,
		numResults,
		searchType: raw.searchType ?? "auto",
		includeDomains,
		excludeDomains,
		startPublishedDate,
		endPublishedDate,
		highlightsMaxCharacters,
	};
}
