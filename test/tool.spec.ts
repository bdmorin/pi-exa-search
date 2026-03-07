import { describe, expect, it, vi } from "vitest";

import { ConfigError, ProviderError } from "../extensions/errors.js";
import { createExaSearchTool } from "../extensions/tool.js";

describe("createExaSearchTool", () => {
	it("executes a search and returns structured details", async () => {
		const search = vi.fn().mockResolvedValue({
			requestId: "req-1",
			costDollars: 0.007,
			results: [
				{
					title: "Example Story",
					url: "https://example.com/story",
					highlights: ["Key point"],
				},
			],
		});
		const tool = createExaSearchTool({
			now: () => new Date("2026-03-06T00:00:00.000Z"),
			getApiKey: () => "exa-key",
			createClient: () => ({ search }),
		});
		const updates: unknown[] = [];

		const result = await tool.execute?.(
			"tool-call",
			{ query: "latest Iran update", recencyFilter: "day" },
			undefined,
			(update) => updates.push(update),
			{} as never,
		);

		expect(search).toHaveBeenCalledWith({
			query: "latest Iran update",
			effectiveParams: {
				queries: ["latest Iran update"],
				numResults: 5,
				searchType: "auto",
				includeDomains: [],
				excludeDomains: [],
				startPublishedDate: "2026-03-05T00:00:00.000Z",
				endPublishedDate: undefined,
				highlightsMaxCharacters: 800,
			},
			signal: undefined,
		});
		expect(updates).toHaveLength(1);
		expect(result?.details).toMatchObject({
			provider: "exa",
			effectiveParams: {
				queries: ["latest Iran update"],
			},
			queries: [
				{
					query: "latest Iran update",
					requestId: "req-1",
					costDollars: 0.007,
				},
			],
		});
		expect(result?.content?.[0]).toMatchObject({ type: "text" });
	});

	it("returns a structured validation error", async () => {
		const tool = createExaSearchTool({
			now: () => new Date("2026-03-06T00:00:00.000Z"),
			getApiKey: () => "exa-key",
			createClient: () => ({ search: vi.fn() }),
		});

		const result = await tool.execute?.("tool-call", { query: "a", queries: ["b"] }, undefined, vi.fn(), {} as never);
		expect(result).toEqual({
			content: [{ type: "text", text: "Error: Provide either query or queries, not both." }],
			details: { error: { code: "query_conflict", message: "Provide either query or queries, not both." } },
		});
	});

	it("returns a structured config error", async () => {
		const tool = createExaSearchTool({
			now: () => new Date("2026-03-06T00:00:00.000Z"),
			getApiKey: () => {
				throw new ConfigError("Missing key");
			},
			createClient: () => ({ search: vi.fn() }),
		});

		const result = await tool.execute?.(
			"tool-call",
			{ query: "latest Iran update" },
			undefined,
			vi.fn(),
			{} as never,
		);
		expect(result).toEqual({
			content: [{ type: "text", text: "Error: Missing key" }],
			details: { error: { code: "config_error", message: "Missing key" } },
		});
	});

	it("returns a structured provider error", async () => {
		const tool = createExaSearchTool({
			now: () => new Date("2026-03-06T00:00:00.000Z"),
			getApiKey: () => "exa-key",
			createClient: () => ({
				search: async () => {
					throw new ProviderError("Rate limited");
				},
			}),
		});

		const result = await tool.execute?.(
			"tool-call",
			{ query: "latest Iran update" },
			undefined,
			vi.fn(),
			{} as never,
		);
		expect(result).toEqual({
			content: [{ type: "text", text: "Error: Rate limited" }],
			details: { error: { code: "provider_error", message: "Rate limited" } },
		});
	});
});
