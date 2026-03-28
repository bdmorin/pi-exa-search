import { StringEnum } from "@mariozechner/pi-ai";
import type { AgentToolResult, ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

import {
	CATEGORIES,
	DEFAULT_HIGHLIGHTS_MAX_CHARACTERS,
	DEFAULT_NUM_RESULTS,
	LIVECRAWL_OPTIONS,
	MAX_HIGHLIGHTS_MAX_CHARACTERS,
	MAX_NUM_RESULTS,
	MIN_HIGHLIGHTS_MAX_CHARACTERS,
	RECENCY_FILTERS,
	SEARCH_TYPES,
	SECTION_TAGS,
	VERBOSITY_OPTIONS,
} from "./constants.js";
import { ConfigError, ProviderError, ValidationError } from "./errors.js";
import { normalizeToolParams } from "./params.js";
import { buildOutput, normalizeExaResults } from "./results.js";
import type { QueryRun, RawToolParams, ToolDeps } from "./types.js";

export function buildErrorResult(error: Error): AgentToolResult<unknown> {
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
					description: `Results per query (default: ${DEFAULT_NUM_RESULTS}, max: ${MAX_NUM_RESULTS}). Pull more when comprehensive coverage matters.`,
					minimum: 1,
					maximum: MAX_NUM_RESULTS,
				}),
			),
			searchType: Type.Optional(
				StringEnum([...SEARCH_TYPES], {
					description:
						"Search method. auto (default ~1s), fast (~450ms), instant (~200ms for real-time), deep (5-60s with reasoning), deep-reasoning (max reasoning).",
				}),
			),
			category: Type.Optional(
				StringEnum([...CATEGORIES], {
					description:
						"Focus on specific content type. company/people have restrictions: no date filters, no text filters, no excludeDomains.",
				}),
			),
			userLocation: Type.Optional(
				Type.String({ description: "Two-letter ISO country code for geo-relevance (e.g. 'US')." }),
			),
			recencyFilter: Type.Optional(
				StringEnum([...RECENCY_FILTERS], {
					description:
						"Filter for freshly published results by relative time window. Cannot combine with explicit date bounds.",
				}),
			),
			startPublishedDate: Type.Optional(
				Type.String({ description: "ISO date or datetime lower bound for publish date." }),
			),
			endPublishedDate: Type.Optional(
				Type.String({ description: "ISO date or datetime upper bound for publish date." }),
			),
			startCrawlDate: Type.Optional(
				Type.String({ description: "ISO date lower bound for when Exa crawled the page." }),
			),
			endCrawlDate: Type.Optional(
				Type.String({ description: "ISO date upper bound for when Exa crawled the page." }),
			),
			includeText: Type.Optional(
				Type.Array(Type.String(), {
					description: "Strings that must appear in page text. Max 1 string, up to 5 words.",
				}),
			),
			excludeText: Type.Optional(
				Type.Array(Type.String(), {
					description: "Strings that must NOT appear in page text. Max 1 string, up to 5 words.",
				}),
			),
			moderation: Type.Optional(Type.Boolean({ description: "Filter unsafe content from results." })),
			domainFilter: Type.Optional(
				Type.Array(Type.String(), {
					description: "Domains to include or exclude with a - prefix, e.g. ['reuters.com', '-reddit.com']",
				}),
			),
			includeDomains: Type.Optional(Type.Array(Type.String(), { description: "Explicit domains to include." })),
			excludeDomains: Type.Optional(Type.Array(Type.String(), { description: "Explicit domains to exclude." })),
			highlightsMaxCharacters: Type.Optional(
				Type.Integer({
					description: `Maximum characters for Exa highlights (default: ${DEFAULT_HIGHLIGHTS_MAX_CHARACTERS}). 4000 recommended for agent workflows.`,
					minimum: MIN_HIGHLIGHTS_MAX_CHARACTERS,
					maximum: MAX_HIGHLIGHTS_MAX_CHARACTERS,
				}),
			),
			// Deep search params
			systemPrompt: Type.Optional(
				Type.String({
					description: "Deep search only. Instructions guiding search planning and result synthesis.",
				}),
			),
			outputSchema: Type.Optional(
				Type.Object(
					{
						type: StringEnum(["text", "object"], {
							description: "'text' for plain text, 'object' for structured JSON.",
						}),
						description: Type.Optional(Type.String({ description: "For type: text, formatting guidance." })),
						properties: Type.Optional(
							Type.Record(Type.String(), Type.Unknown(), {
								description: "For type: object, JSON schema properties. Max depth 2, max 10 properties.",
							}),
						),
						required: Type.Optional(
							Type.Array(Type.String(), { description: "Required property names for object schema." }),
						),
					},
					{ description: "Deep search only. Structured output schema." },
				),
			),
			additionalQueries: Type.Optional(
				Type.Array(Type.String(), {
					description: "Deep search only. Extra query variations (max 5).",
				}),
			),
			// Contents params
			contents: Type.Optional(
				Type.Object(
					{
						text: Type.Optional(
							Type.Union(
								[
									Type.Boolean(),
									Type.Object({
										maxCharacters: Type.Optional(
											Type.Integer({ description: "Character limit for returned text." }),
										),
										includeHtmlTags: Type.Optional(
											Type.Boolean({ description: "Preserve HTML tags. Default: false." }),
										),
										verbosity: Type.Optional(
											StringEnum([...VERBOSITY_OPTIONS], {
												description: "compact (default), standard, or full. Use with maxAgeHours: 0.",
											}),
										),
										includeSections: Type.Optional(
											Type.Array(StringEnum([...SECTION_TAGS]), {
												description: "Only include these page sections.",
											}),
										),
										excludeSections: Type.Optional(
											Type.Array(StringEnum([...SECTION_TAGS]), {
												description: "Exclude these page sections.",
											}),
										),
									}),
								],
								{ description: "Request full page text as markdown. true for defaults, or an options object." },
							),
						),
						highlights: Type.Optional(
							Type.Union(
								[
									Type.Boolean(),
									Type.Object({
										maxCharacters: Type.Optional(
											Type.Integer({ description: "Max characters for highlights." }),
										),
										query: Type.Optional(
											Type.String({ description: "Custom query to direct highlight selection." }),
										),
									}),
								],
								{ description: "Request key excerpts. true for defaults, or options with custom query." },
							),
						),
						summary: Type.Optional(
							Type.Union(
								[
									Type.Boolean(),
									Type.Object({
										query: Type.Optional(
											Type.String({ description: "Custom query for summary generation." }),
										),
										schema: Type.Optional(
											Type.Record(Type.String(), Type.Unknown(), {
												description: "JSON Schema for structured summary output.",
											}),
										),
									}),
								],
								{
									description:
										"Request LLM-generated summary. true for defaults, or options with query/schema.",
								},
							),
						),
						livecrawl: Type.Optional(
							StringEnum([...LIVECRAWL_OPTIONS], { description: "Content freshness strategy." }),
						),
						livecrawlTimeout: Type.Optional(
							Type.Integer({ description: "Timeout for livecrawling in ms. Default: 10000." }),
						),
						maxAgeHours: Type.Optional(
							Type.Integer({
								description: "Max age of cached content in hours. 0=always fresh, -1=cache only.",
							}),
						),
						subpages: Type.Optional(Type.Integer({ description: "Number of subpages to crawl per result." })),
						subpageTarget: Type.Optional(
							Type.Union([Type.String(), Type.Array(Type.String())], {
								description: "Keywords to prioritize when selecting subpages.",
							}),
						),
						extras: Type.Optional(
							Type.Object({
								links: Type.Optional(
									Type.Integer({ description: "Number of URLs to extract from each page." }),
								),
								imageLinks: Type.Optional(Type.Integer({ description: "Number of image URLs to extract." })),
							}),
						),
					},
					{
						description:
							"Content retrieval options. Combine text, highlights, and summary. Default: highlights only.",
					},
				),
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
						resolvedSearchType: response.resolvedSearchType,
						searchTime: response.searchTime,
						output: response.output,
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
