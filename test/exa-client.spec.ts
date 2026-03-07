import { afterEach, describe, expect, it, vi } from "vitest";

import { ProviderError } from "../extensions/errors.js";
import { createExaSearchClient } from "../extensions/exa-client.js";

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
});
