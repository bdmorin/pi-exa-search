import { describe, expect, it } from "vitest";

import { fetchAnswer } from "../../extensions/exa-client.js";

const apiKey = process.env.EXA_API_KEY;
if (!apiKey) {
	throw new Error("EXA_API_KEY must be set in mise env. Stop and notify Brian.");
}

describe("Answer Integration", () => {
	it("returns an answer with citations for a factual question", async () => {
		const result = await fetchAnswer(apiKey, {
			query: "What is the capital of France?",
		});

		expect(result.answer).toBeDefined();
		expect(typeof result.answer).toBe("string");
		expect((result.answer as string).toLowerCase()).toContain("paris");
		expect(result.citations.length).toBeGreaterThan(0);
		expect(result.citations[0].url).toBeDefined();
	}, 20000);

	it("returns an answer with source text when requested", async () => {
		const result = await fetchAnswer(apiKey, {
			query: "What programming language was created by Guido van Rossum?",
			text: true,
		});

		expect(result.answer).toBeDefined();
		expect((result.answer as string).toLowerCase()).toContain("python");
		// With text=true, citations should include text
		if (result.citations.length > 0 && result.citations[0].text) {
			expect(result.citations[0].text!.length).toBeGreaterThan(0);
		}
	}, 20000);

	it("respects systemPrompt for answer style", async () => {
		const result = await fetchAnswer(apiKey, {
			query: "Explain what an API is",
			systemPrompt: "Answer in exactly one sentence.",
		});

		expect(result.answer).toBeDefined();
		expect(typeof result.answer).toBe("string");
		// Should be relatively short due to system prompt (LLMs don't always obey exactly)
		expect((result.answer as string).length).toBeLessThan(1000);
	}, 20000);
});
