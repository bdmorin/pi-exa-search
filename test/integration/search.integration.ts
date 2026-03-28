import { describe, expect, it } from "vitest";

import { createExaSearchClient } from "../../extensions/exa-client.js";
import type { EffectiveSearchParams } from "../../extensions/types.js";

const apiKey = process.env.EXA_API_KEY;
if (!apiKey) {
	throw new Error("EXA_API_KEY must be set in mise env. Stop and notify Brian.");
}

function makeParams(overrides: Partial<EffectiveSearchParams> = {}): EffectiveSearchParams {
	return {
		queries: ["test"],
		numResults: 3,
		searchType: "auto",
		includeDomains: [],
		excludeDomains: [],
		highlightsMaxCharacters: 800,
		...overrides,
	};
}

const client = createExaSearchClient(apiKey);

describe("Search Integration", () => {
	it("basic search returns results with expected structure", async () => {
		const result = await client.search({
			query: "transformer architecture deep learning",
			effectiveParams: makeParams({ numResults: 3 }),
		});

		expect(result.requestId).toBeDefined();
		expect(result.results.length).toBeGreaterThan(0);
		expect(result.costDollars).toBeGreaterThan(0);

		const first = result.results[0];
		expect(first.url).toBeDefined();
		expect(first.title).toBeDefined();
		expect(first.highlights).toBeDefined();
		expect(Array.isArray(first.highlights)).toBe(true);
	});

	it("category: research paper returns academic results", async () => {
		const result = await client.search({
			query: "attention is all you need transformer",
			effectiveParams: makeParams({ category: "research paper", numResults: 3 }),
		});

		expect(result.results.length).toBeGreaterThan(0);
		const urls = result.results.map((r) => r.url);
		// At least one result should be from arxiv or a research site
		expect(urls.some((u) => u?.includes("arxiv") || u?.includes("papers") || u?.includes("scholar"))).toBe(true);
	});

	it("category: company returns results with entities", async () => {
		const result = await client.search({
			query: "Exa AI search company",
			effectiveParams: makeParams({ category: "company", numResults: 5 }),
		});

		expect(result.results.length).toBeGreaterThan(0);
		// Company search should have at least one result with entity data
		const hasEntity = result.results.some((r) => r.entities && r.entities.length > 0);
		expect(hasEntity).toBe(true);
	});

	it("contents.text returns full page text", async () => {
		const result = await client.search({
			query: "web search API for developers",
			effectiveParams: makeParams({
				numResults: 2,
				contents: { text: { maxCharacters: 3000 } },
			}),
		});

		expect(result.results.length).toBeGreaterThan(0);
		const first = result.results[0];
		expect(first.text).toBeDefined();
		expect(typeof first.text).toBe("string");
		expect(first.text!.length).toBeGreaterThan(100);
	});

	it("contents.summary returns LLM summary", async () => {
		const result = await client.search({
			query: "climate change effects on agriculture",
			effectiveParams: makeParams({
				numResults: 2,
				contents: { summary: true },
			}),
		});

		expect(result.results.length).toBeGreaterThan(0);
		const first = result.results[0];
		expect(first.summary).toBeDefined();
		expect(typeof first.summary).toBe("string");
		expect(first.summary!.length).toBeGreaterThan(10);
	}, 15000);

	it("contents.highlights with custom query returns relevant highlights", async () => {
		const result = await client.search({
			query: "neural network architectures comparison",
			effectiveParams: makeParams({
				numResults: 3,
				contents: { highlights: { maxCharacters: 2000, query: "performance benchmarks" } },
			}),
		});

		expect(result.results.length).toBeGreaterThan(0);
		const first = result.results[0];
		expect(first.highlights).toBeDefined();
		expect(first.highlights!.length).toBeGreaterThan(0);
	});

	it("includeText filters content correctly", async () => {
		const result = await client.search({
			query: "programming language comparison",
			effectiveParams: makeParams({
				numResults: 5,
				includeText: ["Python"],
				contents: { text: { maxCharacters: 2000 } },
			}),
		});

		expect(result.results.length).toBeGreaterThan(0);
	});

	it("type: fast returns results with lower latency", async () => {
		const start = Date.now();
		const result = await client.search({
			query: "best programming languages 2026",
			effectiveParams: makeParams({ searchType: "fast", numResults: 3 }),
		});
		const elapsed = Date.now() - start;

		expect(result.results.length).toBeGreaterThan(0);
		// Fast search should typically complete in under 2 seconds
		console.log(`[settings] type=fast elapsed=${elapsed}ms results=${result.results.length}`);
	});

	it("type: instant returns results with lowest latency", async () => {
		const start = Date.now();
		const result = await client.search({
			query: "latest technology news",
			effectiveParams: makeParams({ searchType: "instant", numResults: 3 }),
		});
		const elapsed = Date.now() - start;

		expect(result.results.length).toBeGreaterThan(0);
		console.log(`[settings] type=instant elapsed=${elapsed}ms results=${result.results.length}`);
	});

	it("type: auto returns results with balanced latency", async () => {
		const start = Date.now();
		const result = await client.search({
			query: "latest technology news",
			effectiveParams: makeParams({ searchType: "auto", numResults: 3 }),
		});
		const elapsed = Date.now() - start;

		expect(result.results.length).toBeGreaterThan(0);
		expect(result.resolvedSearchType).toBeDefined();
		console.log(
			`[settings] type=auto resolved=${result.resolvedSearchType} elapsed=${elapsed}ms results=${result.results.length}`,
		);
	});

	it("category company + published date filter returns 400", async () => {
		await expect(
			client.search({
				query: "tech company",
				effectiveParams: makeParams({
					category: "company",
					startPublishedDate: "2026-01-01T00:00:00.000Z",
				}),
			}),
		).rejects.toThrow(/400/);
	});
});
