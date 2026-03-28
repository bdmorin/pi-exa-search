import { afterEach, describe, expect, it, vi } from "vitest";

import { createExaContentsTool } from "../extensions/contents-tool.js";

describe("createExaContentsTool", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("fetches content from URLs and returns structured results", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					results: [
						{
							title: "Example Page",
							url: "https://example.com/page",
							text: "Full page text here...",
						},
					],
					costDollars: { total: 0.001 },
				}),
			}),
		);

		const tool = createExaContentsTool(() => "exa-key");
		const updates: unknown[] = [];

		const result = await tool.execute?.(
			"tool-call",
			{ urls: ["https://example.com/page"] },
			undefined,
			(update) => updates.push(update),
			{} as never,
		);

		expect(updates).toHaveLength(1);
		expect(result?.details).toMatchObject({
			provider: "exa",
			endpoint: "contents",
			urlCount: 1,
			resultCount: 1,
		});
		expect(result?.content?.[0]).toMatchObject({ type: "text" });
	});

	it("passes contents options through to API", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ results: [], costDollars: 0 }),
		});
		vi.stubGlobal("fetch", fetchMock);

		const tool = createExaContentsTool(() => "exa-key");
		await tool.execute?.(
			"tool-call",
			{
				urls: ["https://example.com"],
				contents: { highlights: { maxCharacters: 2000, query: "test" }, summary: true },
			},
			undefined,
			vi.fn(),
			{} as never,
		);

		const body = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(body.urls).toEqual(["https://example.com"]);
		expect(body.highlights).toEqual({ maxCharacters: 2000, query: "test" });
		expect(body.summary).toEqual({});
	});

	it("returns error on API key failure", async () => {
		const tool = createExaContentsTool(() => {
			throw new Error("No key");
		});

		const result = await tool.execute?.(
			"tool-call",
			{ urls: ["https://example.com"] },
			undefined,
			vi.fn(),
			{} as never,
		);

		expect(result?.content?.[0]).toMatchObject({
			type: "text",
			text: "Error: No key",
		});
	});
});
