import { describe, expect, it } from "vitest";

import { ValidationError } from "../extensions/errors.js";
import { normalizeToolParams } from "../extensions/params.js";

describe("normalizeToolParams", () => {
	it("normalizes queries, domains, and recency filters", () => {
		const normalized = normalizeToolParams(
			{
				queries: ["  latest Iran update  ", "latest Iran update", "oil impact"],
				domainFilter: ["Reuters.com", "-https://reddit.com/r/worldnews"],
				recencyFilter: "week",
			},
			{ now: () => new Date("2026-03-06T00:00:00.000Z") },
		);

		expect(normalized).toEqual({
			queries: ["latest Iran update", "oil impact"],
			numResults: 5,
			searchType: "auto",
			includeDomains: ["reuters.com"],
			excludeDomains: ["reddit.com"],
			startPublishedDate: "2026-02-27T00:00:00.000Z",
			endPublishedDate: undefined,
			highlightsMaxCharacters: 800,
		});
	});

	it("normalizes date-only published date bounds to UTC day boundaries", () => {
		const normalized = normalizeToolParams({
			query: "ntu ai policy",
			startPublishedDate: "2026-03-01",
			endPublishedDate: "2026-03-02",
		});

		expect(normalized.startPublishedDate).toBe("2026-03-01T00:00:00.000Z");
		expect(normalized.endPublishedDate).toBe("2026-03-02T23:59:59.999Z");
	});

	it("throws when query and queries are both provided", () => {
		expect(() => normalizeToolParams({ query: "a", queries: ["b"] })).toThrowError(
			new ValidationError("query_conflict", "Provide either query or queries, not both."),
		);
	});

	it("throws when recencyFilter and explicit dates are mixed", () => {
		expect(() =>
			normalizeToolParams({ query: "a", recencyFilter: "day", startPublishedDate: "2026-03-01" }),
		).toThrowError(
			new ValidationError(
				"mixed_date_filters",
				"Use either recencyFilter or explicit published date bounds, not both.",
			),
		);
	});

	it("throws for invalid domains", () => {
		expect(() => normalizeToolParams({ query: "a", includeDomains: ["not a domain"] })).toThrowError(
			new ValidationError("invalid_domain", "Invalid domain filter: not a domain"),
		);
	});

	it("throws for invalid date values", () => {
		expect(() => normalizeToolParams({ query: "a", startPublishedDate: "not-a-date" })).toThrowError(
			new ValidationError("invalid_date", "Invalid startPublishedDate: not-a-date"),
		);
	});

	it("throws for inverted date ranges", () => {
		expect(() =>
			normalizeToolParams({
				query: "a",
				startPublishedDate: "2026-03-03",
				endPublishedDate: "2026-03-02",
			}),
		).toThrowError(
			new ValidationError("invalid_date_range", "startPublishedDate must be before or equal to endPublishedDate."),
		);
	});

	it("throws when the same domain is included and excluded", () => {
		expect(() =>
			normalizeToolParams({
				query: "a",
				includeDomains: ["reuters.com"],
				excludeDomains: ["https://www.reuters.com"],
			}),
		).toThrowError(
			new ValidationError("domain_conflict", "The same domain cannot be both included and excluded: reuters.com"),
		);
	});

	it("throws for invalid numeric bounds", () => {
		expect(() => normalizeToolParams({ query: "a", numResults: 99 })).toThrowError(
			new ValidationError("invalid_num_results", "numResults must be an integer between 1 and 10."),
		);
		expect(() => normalizeToolParams({ query: "a", highlightsMaxCharacters: 100 })).toThrowError(
			new ValidationError(
				"invalid_highlights_max_characters",
				"highlightsMaxCharacters must be an integer between 200 and 4000.",
			),
		);
	});
});
