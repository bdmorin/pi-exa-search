import { describe, expect, it } from "vitest";

import {
	buildAnswerOutput,
	buildContentsOutput,
	buildOutput,
	formatResult,
	normalizeExaResults,
} from "../extensions/results.js";

describe("results helpers", () => {
	it("normalizes Exa results with fallback title and cleaned highlights", () => {
		const normalized = normalizeExaResults([
			{
				url: "https://example.com/story",
				highlights: ["  First\nline  ", "Second line", "Third", "Fourth"],
				author: "  Example Reporter  ",
			},
		]);

		expect(normalized).toMatchObject([
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

	it("normalizes results with new fields (image, favicon, entities, extras)", () => {
		const normalized = normalizeExaResults([
			{
				url: "https://example.com",
				title: "Test",
				image: "https://example.com/img.png",
				favicon: "https://example.com/favicon.ico",
				highlightScores: [0.9],
				highlights: ["test"],
				entities: [{ id: "e1", type: "company", version: 1, properties: { name: "Acme" } }],
				extras: { links: ["https://link1.com"], imageLinks: ["https://img1.com"] },
			},
		]);

		expect(normalized[0].image).toBe("https://example.com/img.png");
		expect(normalized[0].favicon).toBe("https://example.com/favicon.ico");
		expect(normalized[0].highlightScores).toEqual([0.9]);
		expect(normalized[0].entities).toHaveLength(1);
		expect(normalized[0].extras?.links).toEqual(["https://link1.com"]);
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

	it("formats results with text preview when no highlights or summary", () => {
		const output = formatResult(
			{
				title: "Text Page",
				url: "https://example.com",
				highlights: [],
				text: "This is the full page text content that should be previewed.",
			},
			0,
		);
		expect(output).toContain("This is the full page text content");
	});

	it("formats results with entity information", () => {
		const output = formatResult(
			{
				title: "Company Page",
				url: "https://example.com",
				highlights: [],
				entities: [{ id: "e1", type: "company", version: 1, properties: { name: "Acme Corp" } }],
			},
			0,
		);
		expect(output).toContain("[company] Acme Corp");
	});

	it("formats results with extracted links", () => {
		const output = formatResult(
			{
				title: "Links Page",
				url: "https://example.com",
				highlights: ["test"],
				extras: { links: ["https://a.com", "https://b.com"] },
			},
			0,
		);
		expect(output).toContain("links: https://a.com, https://b.com");
	});

	it("formats deep search output in buildOutput", () => {
		const output = buildOutput([
			{
				query: "deep test",
				results: [],
				output: {
					content: "Synthesized answer here",
					grounding: [
						{
							field: "content",
							citations: [{ url: "https://source.com", title: "Source" }],
							confidence: "high",
						},
					],
				},
			},
		]);
		expect(output).toContain("Deep Search Output");
		expect(output).toContain("Synthesized answer here");
		expect(output).toContain("Source: https://source.com (high)");
	});

	it("formats structured deep search output as JSON", () => {
		const output = buildOutput([
			{
				query: "structured",
				results: [],
				output: {
					content: { name: "Test", value: 42 },
					grounding: [],
				},
			},
		]);
		expect(output).toContain('"name": "Test"');
		expect(output).toContain("```json");
	});

	it("buildContentsOutput formats multiple results", () => {
		const output = buildContentsOutput([
			{ title: "Page 1", url: "https://a.com", highlights: ["h1"] },
			{ title: "Page 2", url: "https://b.com", highlights: ["h2"] },
		]);
		expect(output).toContain("Page 1");
		expect(output).toContain("Page 2");
	});

	it("buildContentsOutput handles empty results", () => {
		expect(buildContentsOutput([])).toBe("No contents returned.");
	});

	it("buildAnswerOutput formats string answer with citations", () => {
		const output = buildAnswerOutput("The answer is 42.", [
			{ title: "Source", url: "https://example.com", highlights: [] },
		]);
		expect(output).toContain("The answer is 42.");
		expect(output).toContain("Citations");
		expect(output).toContain("Source — https://example.com");
	});

	it("buildAnswerOutput formats object answer as JSON", () => {
		const output = buildAnswerOutput({ result: "test" }, []);
		expect(output).toContain("```json");
		expect(output).toContain('"result": "test"');
	});
});
