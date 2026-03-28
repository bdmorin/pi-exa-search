import { afterEach, describe, expect, it, vi } from "vitest";

import { ProviderError } from "../extensions/errors.js";
import { createExaSearchClient, fetchAnswer, fetchContents, fetchFindSimilar } from "../extensions/exa-client.js";

describe("createExaSearchClient", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("posts the expected request shape to Exa and normalizes numeric cost", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ requestId: "req-1", costDollars: 0.007, results: [] }),
		});
		vi.stubGlobal("fetch", fetchMock);

		const client = createExaSearchClient("exa-key");
		const result = await client.search({
			query: "latest Iran update",
			effectiveParams: {
				queries: ["latest Iran update"],
				numResults: 5,
				searchType: "auto",
				includeDomains: ["reuters.com"],
				excludeDomains: ["reddit.com"],
				startPublishedDate: "2026-03-05T00:00:00.000Z",
				endPublishedDate: undefined,
				highlightsMaxCharacters: 800,
			},
		});

		expect(fetchMock).toHaveBeenCalledWith(
			"https://api.exa.ai/search",
			expect.objectContaining({
				method: "POST",
				headers: expect.objectContaining({ "x-api-key": "exa-key" }),
			}),
		);
		expect(result.costDollars).toBe(0.007);
	});

	it("normalizes object cost totals", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ requestId: "req-1", costDollars: { total: 0.007 }, results: [] }),
			}),
		);

		const client = createExaSearchClient("exa-key");
		const result = await client.search({
			query: "latest Iran update",
			effectiveParams: {
				queries: ["latest Iran update"],
				numResults: 5,
				searchType: "auto",
				includeDomains: [],
				excludeDomains: [],
				startPublishedDate: undefined,
				endPublishedDate: undefined,
				highlightsMaxCharacters: 800,
			},
		});

		expect(result.costDollars).toBe(0.007);
	});

	it("throws a provider error for non-2xx responses", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429, text: async () => "rate limited" }));

		const client = createExaSearchClient("exa-key");
		await expect(
			client.search({
				query: "latest Iran update",
				effectiveParams: {
					queries: ["latest Iran update"],
					numResults: 5,
					searchType: "auto",
					includeDomains: [],
					excludeDomains: [],
					startPublishedDate: undefined,
					endPublishedDate: undefined,
					highlightsMaxCharacters: 800,
				},
			}),
		).rejects.toThrowError(new ProviderError("Exa API error 429: rate limited"));
	});

	it("throws a provider error for invalid JSON", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => {
					throw new Error("boom");
				},
			}),
		);

		const client = createExaSearchClient("exa-key");
		await expect(
			client.search({
				query: "latest Iran update",
				effectiveParams: {
					queries: ["latest Iran update"],
					numResults: 5,
					searchType: "auto",
					includeDomains: [],
					excludeDomains: [],
					startPublishedDate: undefined,
					endPublishedDate: undefined,
					highlightsMaxCharacters: 800,
				},
			}),
		).rejects.toThrowError(new ProviderError("Exa API returned invalid JSON."));
	});

	it("passes category and text filters in request body", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ results: [], costDollars: 0 }),
		});
		vi.stubGlobal("fetch", fetchMock);

		const client = createExaSearchClient("exa-key");
		await client.search({
			query: "test",
			effectiveParams: {
				queries: ["test"],
				numResults: 10,
				searchType: "auto",
				category: "news",
				includeDomains: [],
				excludeDomains: [],
				includeText: ["keyword"],
				excludeText: ["bad"],
				moderation: true,
				highlightsMaxCharacters: 800,
			},
		});

		const body = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(body.category).toBe("news");
		expect(body.includeText).toEqual(["keyword"]);
		expect(body.excludeText).toEqual(["bad"]);
		expect(body.moderation).toBe(true);
	});

	it("passes deep search params in request body", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				results: [],
				output: { content: "answer", grounding: [] },
				costDollars: 0.02,
			}),
		});
		vi.stubGlobal("fetch", fetchMock);

		const client = createExaSearchClient("exa-key");
		const result = await client.search({
			query: "test",
			effectiveParams: {
				queries: ["test"],
				numResults: 10,
				searchType: "deep",
				includeDomains: [],
				excludeDomains: [],
				highlightsMaxCharacters: 800,
				systemPrompt: "Be concise",
				outputSchema: { type: "text", description: "plain answer" },
				additionalQueries: ["variation"],
			},
		});

		const body = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(body.type).toBe("deep");
		expect(body.systemPrompt).toBe("Be concise");
		expect(body.outputSchema).toEqual({ type: "text", description: "plain answer" });
		expect(body.additionalQueries).toEqual(["variation"]);
		expect(result.output).toEqual({ content: "answer", grounding: [] });
	});

	it("omits optional params when not set", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ results: [], costDollars: 0 }),
		});
		vi.stubGlobal("fetch", fetchMock);

		const client = createExaSearchClient("exa-key");
		await client.search({
			query: "minimal",
			effectiveParams: {
				queries: ["minimal"],
				numResults: 10,
				searchType: "auto",
				includeDomains: [],
				excludeDomains: [],
				highlightsMaxCharacters: 800,
			},
		});

		const body = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(body.category).toBeUndefined();
		expect(body.includeText).toBeUndefined();
		expect(body.excludeText).toBeUndefined();
		expect(body.moderation).toBeUndefined();
		expect(body.systemPrompt).toBeUndefined();
		expect(body.outputSchema).toBeUndefined();
		expect(body.startCrawlDate).toBeUndefined();
		expect(body.userLocation).toBeUndefined();
	});

	it("passes crawl dates and userLocation in request body", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ results: [], costDollars: 0 }),
		});
		vi.stubGlobal("fetch", fetchMock);

		const client = createExaSearchClient("exa-key");
		await client.search({
			query: "test",
			effectiveParams: {
				queries: ["test"],
				numResults: 10,
				searchType: "auto",
				includeDomains: [],
				excludeDomains: [],
				highlightsMaxCharacters: 800,
				startCrawlDate: "2026-01-01T00:00:00.000Z",
				endCrawlDate: "2026-03-01T00:00:00.000Z",
				userLocation: "US",
			},
		});

		const body = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(body.startCrawlDate).toBe("2026-01-01T00:00:00.000Z");
		expect(body.endCrawlDate).toBe("2026-03-01T00:00:00.000Z");
		expect(body.userLocation).toBe("US");
	});

	it("returns resolvedSearchType and searchTime from response", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					results: [],
					costDollars: 0,
					resolvedSearchType: "neural",
					searchTime: 450,
				}),
			}),
		);

		const client = createExaSearchClient("exa-key");
		const result = await client.search({
			query: "test",
			effectiveParams: {
				queries: ["test"],
				numResults: 10,
				searchType: "auto",
				includeDomains: [],
				excludeDomains: [],
				highlightsMaxCharacters: 800,
			},
		});

		expect(result.resolvedSearchType).toBe("neural");
		expect(result.searchTime).toBe(450);
	});

	it("handles contents with highlights false", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ results: [], costDollars: 0 }),
		});
		vi.stubGlobal("fetch", fetchMock);

		const client = createExaSearchClient("exa-key");
		await client.search({
			query: "test",
			effectiveParams: {
				queries: ["test"],
				numResults: 10,
				searchType: "auto",
				includeDomains: [],
				excludeDomains: [],
				highlightsMaxCharacters: 800,
				contents: { highlights: false, text: true },
			},
		});

		const body = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(body.contents.highlights).toBeUndefined();
		expect(body.contents.text).toEqual({});
	});

	it("handles contents with text false (no text in payload)", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ results: [], costDollars: 0 }),
		});
		vi.stubGlobal("fetch", fetchMock);

		const client = createExaSearchClient("exa-key");
		await client.search({
			query: "test",
			effectiveParams: {
				queries: ["test"],
				numResults: 10,
				searchType: "auto",
				includeDomains: [],
				excludeDomains: [],
				highlightsMaxCharacters: 800,
				contents: { text: false, highlights: { maxCharacters: 1000, query: "specific" } },
			},
		});

		const body = JSON.parse(fetchMock.mock.calls[0][1].body);
		// text: false should still result in text being set (it's not undefined)
		expect(body.contents.text).toBe(false);
		expect(body.contents.highlights).toEqual({ maxCharacters: 1000, query: "specific" });
	});

	it("handles contents with summary false", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ results: [], costDollars: 0 }),
		});
		vi.stubGlobal("fetch", fetchMock);

		const client = createExaSearchClient("exa-key");
		await client.search({
			query: "test",
			effectiveParams: {
				queries: ["test"],
				numResults: 10,
				searchType: "auto",
				includeDomains: [],
				excludeDomains: [],
				highlightsMaxCharacters: 800,
				contents: { summary: false },
			},
		});

		const body = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(body.contents.summary).toBe(false);
		// Should still get default highlights since no content mode was requested
		expect(body.contents.highlights).toEqual({ maxCharacters: 800 });
	});

	it("handles highlights with custom query and no maxCharacters", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ results: [], costDollars: 0 }),
		});
		vi.stubGlobal("fetch", fetchMock);

		const client = createExaSearchClient("exa-key");
		await client.search({
			query: "test",
			effectiveParams: {
				queries: ["test"],
				numResults: 10,
				searchType: "auto",
				includeDomains: [],
				excludeDomains: [],
				highlightsMaxCharacters: 800,
				contents: { highlights: { query: "specific topic" } },
			},
		});

		const body = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(body.contents.highlights).toEqual({ maxCharacters: 800, query: "specific topic" });
	});

	it("handles contents with highlights boolean true", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ results: [], costDollars: 0 }),
		});
		vi.stubGlobal("fetch", fetchMock);

		const client = createExaSearchClient("exa-key");
		await client.search({
			query: "test",
			effectiveParams: {
				queries: ["test"],
				numResults: 10,
				searchType: "auto",
				includeDomains: [],
				excludeDomains: [],
				highlightsMaxCharacters: 800,
				contents: { highlights: true },
			},
		});

		const body = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(body.contents.highlights).toEqual({ maxCharacters: 800 });
	});

	it("handles contents with livecrawl and extras", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ results: [], costDollars: 0 }),
		});
		vi.stubGlobal("fetch", fetchMock);

		const client = createExaSearchClient("exa-key");
		await client.search({
			query: "test",
			effectiveParams: {
				queries: ["test"],
				numResults: 10,
				searchType: "auto",
				includeDomains: [],
				excludeDomains: [],
				highlightsMaxCharacters: 800,
				contents: {
					livecrawl: "always",
					livecrawlTimeout: 5000,
					subpageTarget: "docs",
					extras: { links: 5, imageLinks: 3 },
				},
			},
		});

		const body = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(body.contents.livecrawl).toBe("always");
		expect(body.contents.livecrawlTimeout).toBe(5000);
		expect(body.contents.subpageTarget).toBe("docs");
		expect(body.contents.extras).toEqual({ links: 5, imageLinks: 3 });
	});

	it("builds contents payload from explicit contents options", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ results: [], costDollars: 0 }),
		});
		vi.stubGlobal("fetch", fetchMock);

		const client = createExaSearchClient("exa-key");
		await client.search({
			query: "test",
			effectiveParams: {
				queries: ["test"],
				numResults: 10,
				searchType: "auto",
				includeDomains: [],
				excludeDomains: [],
				highlightsMaxCharacters: 800,
				contents: {
					text: { maxCharacters: 5000 },
					summary: true,
					maxAgeHours: 0,
					subpages: 3,
				},
			},
		});

		const body = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(body.contents.text).toEqual({ maxCharacters: 5000 });
		expect(body.contents.summary).toEqual({});
		expect(body.contents.maxAgeHours).toBe(0);
		expect(body.contents.subpages).toBe(3);
	});
});

describe("fetchContents", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("posts URLs to /contents and returns results", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				results: [{ url: "https://example.com", title: "Example", text: "Content" }],
				costDollars: { total: 0.001 },
			}),
		});
		vi.stubGlobal("fetch", fetchMock);

		const result = await fetchContents("exa-key", { urls: ["https://example.com"] });

		expect(fetchMock).toHaveBeenCalledWith(
			"https://api.exa.ai/contents",
			expect.objectContaining({ method: "POST" }),
		);
		expect(result.results).toHaveLength(1);
		expect(result.costDollars).toBe(0.001);
	});

	it("defaults to text extraction when no contents options", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ results: [], costDollars: 0 }),
		});
		vi.stubGlobal("fetch", fetchMock);

		await fetchContents("exa-key", { urls: ["https://example.com"] });
		const body = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(body.text).toEqual({ maxCharacters: 10000 });
	});

	it("passes all content options through", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ results: [], costDollars: 0 }),
		});
		vi.stubGlobal("fetch", fetchMock);

		await fetchContents("exa-key", {
			urls: ["https://example.com"],
			contents: {
				text: { maxCharacters: 5000 },
				highlights: { maxCharacters: 2000, query: "test" },
				summary: { query: "summarize" },
				livecrawl: "always",
				livecrawlTimeout: 5000,
				maxAgeHours: 0,
				subpages: 5,
				subpageTarget: "docs",
				extras: { links: 3 },
			},
		});

		const body = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(body.text).toEqual({ maxCharacters: 5000 });
		expect(body.highlights).toEqual({ maxCharacters: 2000, query: "test" });
		expect(body.summary).toEqual({ query: "summarize" });
		expect(body.livecrawl).toBe("always");
		expect(body.livecrawlTimeout).toBe(5000);
		expect(body.maxAgeHours).toBe(0);
		expect(body.subpages).toBe(5);
		expect(body.subpageTarget).toBe("docs");
		expect(body.extras).toEqual({ links: 3 });
	});

	it("returns statuses from API response", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					results: [],
					statuses: [{ id: "https://example.com", status: "success" }],
					costDollars: 0,
				}),
			}),
		);

		const result = await fetchContents("exa-key", { urls: ["https://example.com"] });
		expect(result.statuses).toHaveLength(1);
		expect(result.statuses?.[0].status).toBe("success");
	});
});

describe("fetchFindSimilar", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("posts URL to /findSimilar and returns results", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				results: [{ url: "https://similar.com", title: "Similar" }],
				costDollars: { total: 0.007 },
			}),
		});
		vi.stubGlobal("fetch", fetchMock);

		const result = await fetchFindSimilar("exa-key", { url: "https://example.com" });

		expect(fetchMock).toHaveBeenCalledWith(
			"https://api.exa.ai/findSimilar",
			expect.objectContaining({ method: "POST" }),
		);
		expect(result.results).toHaveLength(1);
	});

	it("passes all filter options through", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ results: [], costDollars: 0 }),
		});
		vi.stubGlobal("fetch", fetchMock);

		await fetchFindSimilar("exa-key", {
			url: "https://example.com",
			numResults: 20,
			excludeSourceDomain: true,
			includeDomains: ["news.com"],
			category: "news",
			includeText: ["AI"],
			startPublishedDate: "2026-01-01",
			contents: { highlights: { maxCharacters: 2000 } },
		});

		const body = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(body.url).toBe("https://example.com");
		expect(body.numResults).toBe(20);
		expect(body.excludeSourceDomain).toBe(true);
		expect(body.includeDomains).toEqual(["news.com"]);
		expect(body.category).toBe("news");
		expect(body.includeText).toEqual(["AI"]);
		expect(body.contents.highlights).toEqual({ maxCharacters: 2000 });
	});
});

describe("fetchAnswer", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("posts query to /answer and returns answer with citations", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				answer: "42",
				citations: [{ url: "https://example.com", title: "Source" }],
				requestId: "ans-1",
				costDollars: { total: 0.01 },
			}),
		});
		vi.stubGlobal("fetch", fetchMock);

		const result = await fetchAnswer("exa-key", { query: "What is the answer?" });

		expect(fetchMock).toHaveBeenCalledWith("https://api.exa.ai/answer", expect.objectContaining({ method: "POST" }));
		expect(result.answer).toBe("42");
		expect(result.citations).toHaveLength(1);
	});

	it("passes systemPrompt and outputSchema", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ answer: "test", citations: [], costDollars: 0 }),
		});
		vi.stubGlobal("fetch", fetchMock);

		await fetchAnswer("exa-key", {
			query: "test",
			systemPrompt: "Be brief",
			outputSchema: { type: "object" },
			text: true,
		});

		const body = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(body.systemPrompt).toBe("Be brief");
		expect(body.outputSchema).toEqual({ type: "object" });
		expect(body.text).toBe(true);
	});
});
