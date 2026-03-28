import type { DeepSearchOutput, ExaApiResult, NormalizedResult, QueryRun } from "./types.js";

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
			highlightScores: result.highlightScores,
			summary: result.summary ? normalizeWhitespace(result.summary) : undefined,
			text: result.text,
			score: typeof result.score === "number" ? result.score : undefined,
			id: result.id,
			image: result.image,
			favicon: result.favicon,
			entities: result.entities,
			subpages: result.subpages ? normalizeExaResults(result.subpages) : undefined,
			extras: result.extras,
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

	if (result.text && result.highlights.length === 0 && !result.summary) {
		const preview = result.text.slice(0, 500);
		lines.push(`   - ${preview}${result.text.length > 500 ? "..." : ""}`);
	}

	if (result.entities?.length) {
		for (const entity of result.entities) {
			if (entity.type === "company" && entity.properties.name) {
				lines.push(`   [company] ${entity.properties.name}`);
			} else if (entity.type === "person" && entity.properties.name) {
				lines.push(`   [person] ${entity.properties.name}`);
			}
		}
	}

	if (result.extras?.links?.length) {
		lines.push(
			`   links: ${result.extras.links.slice(0, 3).join(", ")}${result.extras.links.length > 3 ? ` (+${result.extras.links.length - 3} more)` : ""}`,
		);
	}

	return lines.join("\n");
}

function formatDeepOutput(output: DeepSearchOutput): string {
	const lines: string[] = [];
	lines.push("## Deep Search Output");

	if (typeof output.content === "string") {
		lines.push(output.content);
	} else {
		lines.push("```json");
		lines.push(JSON.stringify(output.content, null, 2));
		lines.push("```");
	}

	if (output.grounding?.length) {
		lines.push("");
		lines.push("### Sources");
		for (const g of output.grounding) {
			const confidence = g.confidence ? ` (${g.confidence})` : "";
			for (const c of g.citations) {
				lines.push(`- ${c.title}: ${c.url}${confidence}`);
			}
		}
	}

	return lines.join("\n");
}

export function buildOutput(queryRuns: QueryRun[]): string {
	const sections: string[] = [];

	for (const queryRun of queryRuns) {
		sections.push(`Results for: ${queryRun.query}`);
		if (queryRun.results.length === 0) {
			sections.push("No results.");
		} else {
			sections.push(queryRun.results.map((result, index) => formatResult(result, index)).join("\n"));
		}

		if (queryRun.output) {
			sections.push("");
			sections.push(formatDeepOutput(queryRun.output));
		}

		sections.push("");
	}

	sections.push(
		"Suggested next step: use fetch_content on the most relevant URLs for full extraction before final synthesis.",
	);

	return sections.join("\n").trim();
}

export function buildContentsOutput(results: NormalizedResult[]): string {
	if (results.length === 0) return "No contents returned.";

	const sections: string[] = [];
	for (const [index, result] of results.entries()) {
		sections.push(formatResult(result, index));
	}
	return sections.join("\n\n");
}

export function buildAnswerOutput(answer: string | Record<string, unknown>, citations: NormalizedResult[]): string {
	const lines: string[] = [];

	if (typeof answer === "string") {
		lines.push(answer);
	} else {
		lines.push("```json");
		lines.push(JSON.stringify(answer, null, 2));
		lines.push("```");
	}

	if (citations.length > 0) {
		lines.push("");
		lines.push("### Citations");
		for (const [i, c] of citations.entries()) {
			lines.push(`${i + 1}. ${c.title} — ${c.url}`);
		}
	}

	return lines.join("\n");
}
