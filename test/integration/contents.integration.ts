import { describe, expect, it } from "vitest";

import { fetchContents } from "../../extensions/exa-client.js";

const apiKey = process.env.EXA_API_KEY;
if (!apiKey) {
	throw new Error("EXA_API_KEY must be set in mise env. Stop and notify Brian.");
}

describe("Contents Integration", () => {
	it("fetches text from a known stable URL", async () => {
		const result = await fetchContents(apiKey, {
			urls: ["https://en.wikipedia.org/wiki/Web_search_engine"],
			contents: { text: { maxCharacters: 5000 } },
		});

		expect(result.results.length).toBeGreaterThan(0);
		const first = result.results[0];
		expect(first.text).toBeDefined();
		expect(first.text!.length).toBeGreaterThan(500);
		expect(first.url).toContain("wikipedia.org");
	});

	it("fetches highlights from a URL with custom query", async () => {
		const result = await fetchContents(apiKey, {
			urls: ["https://en.wikipedia.org/wiki/Search_engine"],
			contents: { highlights: { maxCharacters: 2000, query: "how search engines work" } },
		});

		expect(result.results.length).toBeGreaterThan(0);
		const first = result.results[0];
		expect(first.highlights).toBeDefined();
		expect(first.highlights!.length).toBeGreaterThan(0);
	});

	it("fetches summary from a URL", async () => {
		const result = await fetchContents(apiKey, {
			urls: ["https://en.wikipedia.org/wiki/Artificial_intelligence"],
			contents: { summary: true },
		});

		expect(result.results.length).toBeGreaterThan(0);
		const first = result.results[0];
		expect(first.summary).toBeDefined();
		expect(typeof first.summary).toBe("string");
		expect(first.summary!.length).toBeGreaterThan(10);
	}, 15000);

	it("fetches multiple URLs", async () => {
		const result = await fetchContents(apiKey, {
			urls: ["https://en.wikipedia.org/wiki/Python_(programming_language)", "https://en.wikipedia.org/wiki/TypeScript"],
			contents: { highlights: { maxCharacters: 1000 } },
		});

		expect(result.results.length).toBe(2);
	});
});
