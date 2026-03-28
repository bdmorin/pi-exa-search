import { StringEnum } from "@mariozechner/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

import { CATEGORIES, LIVECRAWL_OPTIONS, SECTION_TAGS, VERBOSITY_OPTIONS } from "./constants.js";
import { fetchFindSimilar } from "./exa-client.js";
import { buildContentsOutput, normalizeExaResults } from "./results.js";
import { buildErrorResult } from "./tool.js";
import type { RawFindSimilarParams } from "./types.js";

export function createExaFindSimilarTool(getApiKey: () => string): Parameters<ExtensionAPI["registerTool"]>[0] {
	return {
		name: "exa_find_similar",
		label: "Exa Find Similar",
		description:
			"Find pages similar to a given URL. Great for snowball research — find one good source, then discover more like it. Returns results with the same content options as search.",
		parameters: Type.Object({
			url: Type.String({ description: "The URL to find similar pages for." }),
			numResults: Type.Optional(
				Type.Integer({ description: "Number of results (default: 10, max: 100).", minimum: 1, maximum: 100 }),
			),
			excludeSourceDomain: Type.Optional(
				Type.Boolean({ description: "Exclude results from the same domain as the input URL." }),
			),
			includeDomains: Type.Optional(Type.Array(Type.String())),
			excludeDomains: Type.Optional(Type.Array(Type.String())),
			startPublishedDate: Type.Optional(Type.String()),
			endPublishedDate: Type.Optional(Type.String()),
			startCrawlDate: Type.Optional(Type.String()),
			endCrawlDate: Type.Optional(Type.String()),
			category: Type.Optional(StringEnum([...CATEGORIES])),
			includeText: Type.Optional(Type.Array(Type.String())),
			excludeText: Type.Optional(Type.Array(Type.String())),
			contents: Type.Optional(
				Type.Object({
					text: Type.Optional(
						Type.Union([
							Type.Boolean(),
							Type.Object({
								maxCharacters: Type.Optional(Type.Integer()),
								includeHtmlTags: Type.Optional(Type.Boolean()),
								verbosity: Type.Optional(StringEnum([...VERBOSITY_OPTIONS])),
								includeSections: Type.Optional(Type.Array(StringEnum([...SECTION_TAGS]))),
								excludeSections: Type.Optional(Type.Array(StringEnum([...SECTION_TAGS]))),
							}),
						]),
					),
					highlights: Type.Optional(
						Type.Union([
							Type.Boolean(),
							Type.Object({
								maxCharacters: Type.Optional(Type.Integer()),
								query: Type.Optional(Type.String()),
							}),
						]),
					),
					summary: Type.Optional(
						Type.Union([
							Type.Boolean(),
							Type.Object({
								query: Type.Optional(Type.String()),
								schema: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
							}),
						]),
					),
					livecrawl: Type.Optional(StringEnum([...LIVECRAWL_OPTIONS])),
					livecrawlTimeout: Type.Optional(Type.Integer()),
					maxAgeHours: Type.Optional(Type.Integer()),
					subpages: Type.Optional(Type.Integer()),
					subpageTarget: Type.Optional(Type.Union([Type.String(), Type.Array(Type.String())])),
					extras: Type.Optional(
						Type.Object({
							links: Type.Optional(Type.Integer()),
							imageLinks: Type.Optional(Type.Integer()),
						}),
					),
				}),
			),
		}),
		async execute(_toolCallId, params, signal, onUpdate, _ctx: ExtensionContext) {
			try {
				const apiKey = getApiKey();
				const rawParams = params as RawFindSimilarParams;

				onUpdate?.({
					content: [{ type: "text", text: `Finding pages similar to ${rawParams.url}...` }],
					details: { phase: "searching", url: rawParams.url },
				});

				const response = await fetchFindSimilar(apiKey, rawParams, signal ?? undefined);
				const results = normalizeExaResults(response.results);

				return {
					content: [{ type: "text", text: buildContentsOutput(results) }],
					details: {
						provider: "exa",
						endpoint: "findSimilar",
						sourceUrl: rawParams.url,
						resultCount: results.length,
						costDollars: response.costDollars,
					},
				};
			} catch (error) {
				if (error instanceof Error) return buildErrorResult(error);
				return buildErrorResult(new Error(String(error)));
			}
		},
	};
}
