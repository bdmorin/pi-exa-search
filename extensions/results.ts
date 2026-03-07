import type { ExaApiResult, NormalizedResult, QueryRun } from "./types.js";

function normalizeWhitespace(value: string): string {
	return value.replace(/\s+/g, " ").trim();
}

export function normalizeExaResults(results: ExaApiResult[]): NormalizedResult[] {
	return results
		.filter((result) => typeof result.url === "string" && result.url.length > 0)
		.map((result, index) => ({
			title: normalizeWhitespace(result.title || "") || `Result ${index + 1}`,
			url: result.url!,
			publishedDate: result.publishedDate,
			author: result.author ? normalizeWhitespace(result.author) : undefined,
			highlights: Array.isArray(result.highlights)
				? result.highlights.map(normalizeWhitespace).filter(Boolean).slice(0, 3)
				: [],
			summary: result.summary ? normalizeWhitespace(result.summary) : undefined,
			score: typeof result.score === "number" ? result.score : undefined,
			id: result.id,
		}));
}

export function formatResult(result: NormalizedResult, index: number): string {
	const lines = [`${index + 1}. ${result.title}`, `   ${result.url}`];
	const meta: string[] = [];

	if (result.publishedDate) meta.push(`published ${result.publishedDate}`);
	if (result.author) meta.push(`author ${result.author}`);
	if (typeof result.score === "number") meta.push(`score ${result.score.toFixed(3)}`);
	if (meta.length > 0) lines.push(`   - ${meta.join(" · ")}`);

	for (const highlight of result.highlights) {
		lines.push(`   - ${highlight}`);
	}

	if (result.highlights.length === 0 && result.summary) {
		lines.push(`   - ${result.summary}`);
	}

	return lines.join("\n");
}

export function buildOutput(queryRuns: QueryRun[]): string {
	const sections: string[] = [];

	for (const queryRun of queryRuns) {
		sections.push(`Results for: ${queryRun.query}`);
		if (queryRun.results.length === 0) {
			sections.push("No results.");
			sections.push("");
			continue;
		}

		sections.push(queryRun.results.map((result, index) => formatResult(result, index)).join("\n"));
		sections.push("");
	}

	sections.push(
		"Suggested next step: use fetch_content on the most relevant URLs for full extraction before final synthesis.",
	);

	return sections.join("\n").trim();
}
