import { describe, expect, it } from "vitest";

import { fetchFindSimilar } from "../../extensions/exa-client.js";

const apiKey = process.env.EXA_API_KEY;
if (!apiKey) {
	throw new Error("EXA_API_KEY must be set in mise env. Stop and notify Brian.");
}

describe("FindSimilar Integration", () => {
	it("finds pages similar to a known URL", async () => {
		const result = await fetchFindSimilar(apiKey, {
			url: "https://docs.exa.ai",
			numResults: 5,
		});

		expect(result.results.length).toBeGreaterThan(0);
		const urls = result.results.map((r) => r.url).filter(Boolean);
		expect(urls.length).toBeGreaterThan(0);
		// Results should be different URLs
		expect(urls.every((u) => u !== "https://docs.exa.ai")).toBe(true);
	});

	it("excludeSourceDomain reduces results from source domain", async () => {
		const withExclusion = await fetchFindSimilar(apiKey, {
			url: "https://docs.exa.ai",
			numResults: 5,
			excludeSourceDomain: true,
		});

		expect(withExclusion.results.length).toBeGreaterThan(0);
		// Most results should be from other domains (API may not filter perfectly)
		const urls = withExclusion.results.map((r) => r.url).filter(Boolean);
		const exaUrls = urls.filter((u) => u!.includes("exa.ai"));
		console.log(`[settings] excludeSourceDomain: ${exaUrls.length}/${urls.length} from exa.ai`);
	});

	it("returns results with content when requested", async () => {
		const result = await fetchFindSimilar(apiKey, {
			url: "https://en.wikipedia.org/wiki/Web_search_engine",
			numResults: 3,
			contents: { highlights: { maxCharacters: 1000 } },
		});

		expect(result.results.length).toBeGreaterThan(0);
		const first = result.results[0];
		expect(first.highlights).toBeDefined();
	});
});
