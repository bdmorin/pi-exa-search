import { StringEnum } from "@mariozechner/pi-ai";
import type { AgentToolResult, ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

import {
	DEFAULT_HIGHLIGHTS_MAX_CHARACTERS,
	DEFAULT_NUM_RESULTS,
	MAX_HIGHLIGHTS_MAX_CHARACTERS,
	MAX_NUM_RESULTS,
	MIN_HIGHLIGHTS_MAX_CHARACTERS,
	RECENCY_FILTERS,
	SEARCH_TYPES,
} from "./constants.js";
import { ConfigError, ProviderError, ValidationError } from "./errors.js";
import { normalizeToolParams } from "./params.js";
import { buildOutput, normalizeExaResults } from "./results.js";
import type { QueryRun, RawToolParams, ToolDeps } from "./types.js";

function buildErrorResult(error: Error): AgentToolResult<unknown> {
	const code =
		error instanceof ValidationError
			? error.code
			: error instanceof ConfigError
				? "config_error"
				: error instanceof ProviderError
					? "provider_error"
					: "unknown_error";

	return {
		content: [{ type: "text", text: `Error: ${error.message}` }],
		details: {
			error: {
				code,
				message: error.message,
				...(error instanceof ValidationError && error.details ? { details: error.details } : {}),
			},
		},
	};
}

export function createExaSearchTool(deps: ToolDeps): Parameters<ExtensionAPI["registerTool"]>[0] {
	return {
		name: "exa_search",
		label: "Exa Search",
		description:
			"Search the web with Exa for source discovery. Works standalone for URL discovery and works even better with pi-web-access when fetch_content is available for full extraction.",
		parameters: Type.Object({
			query: Type.Optional(
				Type.String({
					description: "Single search query. For broader research, prefer queries with 2-4 varied angles.",
				}),
			),
			queries: Type.Optional(
				Type.Array(Type.String(), {
					description: "Multiple queries searched sequentially. Useful for sitreps and multi-angle research.",
				}),
			),
			numResults: Type.Optional(
				Type.Integer({
					description: `Results per query (default: ${DEFAULT_NUM_RESULTS}, max: ${MAX_NUM_RESULTS})`,
					minimum: 1,
					maximum: MAX_NUM_RESULTS,
				}),
			),
			searchType: Type.Optional(StringEnum([...SEARCH_TYPES], { description: "Exa search mode (default: auto)" })),
			recencyFilter: Type.Optional(
				StringEnum([...RECENCY_FILTERS], {
					description: "Filter for freshly published results by relative time window",
				}),
			),
			startPublishedDate: Type.Optional(
				Type.String({ description: "ISO date or datetime. Example: 2026-03-01 or 2026-03-01T00:00:00Z" }),
			),
			endPublishedDate: Type.Optional(Type.String({ description: "ISO date or datetime upper bound" })),
			domainFilter: Type.Optional(
				Type.Array(Type.String(), {
					description: "Domains to include or exclude with a - prefix, e.g. ['reuters.com', '-reddit.com']",
				}),
			),
			includeDomains: Type.Optional(Type.Array(Type.String(), { description: "Explicit domains to include" })),
			excludeDomains: Type.Optional(Type.Array(Type.String(), { description: "Explicit domains to exclude" })),
			highlightsMaxCharacters: Type.Optional(
				Type.Integer({
					description: `Maximum characters for Exa highlights (default: ${DEFAULT_HIGHLIGHTS_MAX_CHARACTERS})`,
					minimum: MIN_HIGHLIGHTS_MAX_CHARACTERS,
					maximum: MAX_HIGHLIGHTS_MAX_CHARACTERS,
				}),
			),
		}),
		async execute(_toolCallId, params, signal, onUpdate, _ctx: ExtensionContext) {
			try {
				const effectiveParams = normalizeToolParams(params as RawToolParams, { now: deps.now });
				const apiKey = deps.getApiKey();
				const client = deps.createClient(apiKey);
				const queryRuns: QueryRun[] = [];

				for (const [index, query] of effectiveParams.queries.entries()) {
					if (signal?.aborted) {
						throw new Error("Search aborted.");
					}

					onUpdate?.({
						content: [
							{ type: "text", text: `Exa searching ${index + 1}/${effectiveParams.queries.length}: ${query}` },
						],
						details: {
							phase: "searching",
							currentQuery: query,
							progress: index / effectiveParams.queries.length,
						},
					});

					const response = await client.search({ query, effectiveParams, signal });
					queryRuns.push({
						query,
						requestId: response.requestId,
						costDollars: response.costDollars,
						results: normalizeExaResults(response.results),
					});
				}

				return {
					content: [{ type: "text", text: buildOutput(queryRuns) }],
					details: {
						provider: "exa",
						effectiveParams,
						queries: queryRuns,
					},
				};
			} catch (error) {
				if (error instanceof Error) return buildErrorResult(error);
				return buildErrorResult(new Error(String(error)));
			}
		},
	};
}
