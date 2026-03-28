import { afterEach, describe, expect, it, vi } from "vitest";

import { createExaFindSimilarTool } from "../extensions/find-similar-tool.js";

describe("createExaFindSimilarTool", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("finds similar pages and returns structured results", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					results: [
						{
							title: "Similar Page",
							url: "https://example.com/similar",
							text: "Similar content...",
						},
					],
					costDollars: { total: 0.007 },
				}),
			}),
		);

		const tool = createExaFindSimilarTool(() => "exa-key");
		const updates: unknown[] = [];

		const result = await tool.execute?.(
			"tool-call",
			{ url: "https://example.com/source" },
			undefined,
			(update) => updates.push(update),
			{} as never,
		);

		expect(updates).toHaveLength(1);
		expect(result?.details).toMatchObject({
			provider: "exa",
			endpoint: "findSimilar",
			sourceUrl: "https://example.com/source",
			resultCount: 1,
		});
	});

	it("passes excludeSourceDomain and filters through", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ results: [], costDollars: 0 }),
		});
		vi.stubGlobal("fetch", fetchMock);

		const tool = createExaFindSimilarTool(() => "exa-key");
		await tool.execute?.(
			"tool-call",
			{
				url: "https://example.com/source",
				excludeSourceDomain: true,
				numResults: 5,
				category: "news",
			},
			undefined,
			vi.fn(),
			{} as never,
		);

		const body = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(body.url).toBe("https://example.com/source");
		expect(body.excludeSourceDomain).toBe(true);
		expect(body.numResults).toBe(5);
		expect(body.category).toBe("news");
	});

	it("returns error on provider failure", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => "internal error" }));

		const tool = createExaFindSimilarTool(() => "exa-key");
		const result = await tool.execute?.(
			"tool-call",
			{ url: "https://example.com/source" },
			undefined,
			vi.fn(),
			{} as never,
		);

		expect(result?.content?.[0]).toMatchObject({
			type: "text",
			text: expect.stringContaining("Exa API error 500"),
		});
	});
});
