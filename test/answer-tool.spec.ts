import { afterEach, describe, expect, it, vi } from "vitest";

import { createExaAnswerTool } from "../extensions/answer-tool.js";

describe("createExaAnswerTool", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("returns an answer with citations", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					answer: "The capital of France is Paris.",
					citations: [
						{
							title: "France - Wikipedia",
							url: "https://en.wikipedia.org/wiki/France",
						},
					],
					requestId: "ans-1",
					costDollars: { total: 0.01 },
				}),
			}),
		);

		const tool = createExaAnswerTool(() => "exa-key");
		const updates: unknown[] = [];

		const result = await tool.execute?.(
			"tool-call",
			{ query: "What is the capital of France?" },
			undefined,
			(update) => updates.push(update),
			{} as never,
		);

		expect(updates).toHaveLength(1);
		expect(result?.details).toMatchObject({
			provider: "exa",
			endpoint: "answer",
			requestId: "ans-1",
			citationCount: 1,
		});
		const text = (result?.content?.[0] as { text: string })?.text;
		expect(text).toContain("Paris");
		expect(text).toContain("France - Wikipedia");
	});

	it("passes systemPrompt and outputSchema through", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				answer: '{"result": "test"}',
				citations: [],
				requestId: "ans-2",
				costDollars: 0.01,
			}),
		});
		vi.stubGlobal("fetch", fetchMock);

		const tool = createExaAnswerTool(() => "exa-key");
		await tool.execute?.(
			"tool-call",
			{
				query: "test query",
				systemPrompt: "Answer concisely",
				outputSchema: { type: "object", properties: { result: { type: "string" } } },
				text: true,
			},
			undefined,
			vi.fn(),
			{} as never,
		);

		const body = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(body.query).toBe("test query");
		expect(body.systemPrompt).toBe("Answer concisely");
		expect(body.outputSchema).toEqual({ type: "object", properties: { result: { type: "string" } } });
		expect(body.text).toBe(true);
	});

	it("handles structured answer objects", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					answer: { capital: "Paris", country: "France" },
					citations: [],
					costDollars: 0.01,
				}),
			}),
		);

		const tool = createExaAnswerTool(() => "exa-key");
		const result = await tool.execute?.("tool-call", { query: "test" }, undefined, vi.fn(), {} as never);

		const text = (result?.content?.[0] as { text: string })?.text;
		expect(text).toContain("Paris");
		expect(text).toContain("France");
	});

	it("handles numeric costDollars", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					answer: "test",
					citations: [],
					costDollars: 0.005,
				}),
			}),
		);

		const tool = createExaAnswerTool(() => "exa-key");
		const result = await tool.execute?.("tool-call", { query: "test" }, undefined, vi.fn(), {} as never);
		expect(result?.details).toMatchObject({ costDollars: 0.005 });
	});

	it("handles missing costDollars", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					answer: "test",
					citations: [],
				}),
			}),
		);

		const tool = createExaAnswerTool(() => "exa-key");
		const result = await tool.execute?.("tool-call", { query: "test" }, undefined, vi.fn(), {} as never);
		expect(result?.details).toMatchObject({ costDollars: undefined });
	});

	it("returns error on failure", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429, text: async () => "rate limited" }));

		const tool = createExaAnswerTool(() => "exa-key");
		const result = await tool.execute?.("tool-call", { query: "test" }, undefined, vi.fn(), {} as never);

		expect(result?.content?.[0]).toMatchObject({
			type: "text",
			text: expect.stringContaining("Exa API error 429"),
		});
	});
});
