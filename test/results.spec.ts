import { describe, expect, it } from "vitest";

import { buildOutput, formatResult, normalizeExaResults } from "../extensions/results.js";

describe("results helpers", () => {
	it("normalizes Exa results with fallback title and cleaned highlights", () => {
		const normalized = normalizeExaResults([
			{
				url: "https://example.com/story",
				highlights: ["  First\nline  ", "Second line", "Third", "Fourth"],
				author: "  Example Reporter  ",
			},
		]);

		expect(normalized).toEqual([
			{
				title: "Result 1",
				url: "https://example.com/story",
				publishedDate: undefined,
				author: "Example Reporter",
				highlights: ["First line", "Second line", "Third"],
				summary: undefined,
				score: undefined,
				id: undefined,
			},
		]);
	});

	it("drops results without URLs", () => {
		expect(normalizeExaResults([{ title: "No URL" }])).toEqual([]);
	});

	it("formats a single result block", () => {
		const output = formatResult(
			{
				title: "Example Story",
				url: "https://example.com/story",
				publishedDate: "2026-03-06T00:00:00.000Z",
				author: "Reporter",
				highlights: ["Key point"],
				summary: undefined,
				score: 0.5,
				id: "1",
			},
			0,
		);

		expect(output).toContain("1. Example Story");
		expect(output).toContain("published 2026-03-06T00:00:00.000Z · author Reporter · score 0.500");
		expect(output).toContain("Key point");
	});

	it("builds readable output with next-step guidance", () => {
		const output = buildOutput([
			{
				query: "latest Iran update",
				results: [
					{
						title: "Example Story",
						url: "https://example.com/story",
						publishedDate: undefined,
						author: undefined,
						highlights: [],
						summary: "Useful summary",
						score: undefined,
						id: undefined,
					},
				],
				requestId: "req-1",
				costDollars: 0.01,
			},
		]);

		expect(output).toContain("Results for: latest Iran update");
		expect(output).toContain("Useful summary");
		expect(output).toContain("Suggested next step: use fetch_content");
	});

	it("handles queries with no results", () => {
		const output = buildOutput([{ query: "no hits", requestId: "req-1", costDollars: 0, results: [] }]);
		expect(output).toContain("No results.");
	});
});
