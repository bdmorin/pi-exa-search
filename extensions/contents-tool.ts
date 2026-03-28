import { StringEnum } from "@mariozechner/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

import { LIVECRAWL_OPTIONS, SECTION_TAGS, VERBOSITY_OPTIONS } from "./constants.js";
import { fetchContents } from "./exa-client.js";
import { buildContentsOutput, normalizeExaResults } from "./results.js";
import { buildErrorResult } from "./tool.js";
import type { RawContentsParams } from "./types.js";

export function createExaContentsTool(getApiKey: () => string): Parameters<ExtensionAPI["registerTool"]>[0] {
	return {
		name: "exa_contents",
		label: "Exa Contents",
		description:
			"Fetch clean, structured content from any URL(s) via Exa. Handles JS-rendered pages, PDFs, and complex layouts. Returns full text, highlights, summaries, or all three. Use instead of fetch_content when you already have URLs.",
		parameters: Type.Object({
			urls: Type.Array(Type.String(), {
				description: "One or more URLs to extract content from.",
				minItems: 1,
			}),
			contents: Type.Optional(
				Type.Object({
					text: Type.Optional(
						Type.Union(
							[
								Type.Boolean(),
								Type.Object({
									maxCharacters: Type.Optional(Type.Integer()),
									includeHtmlTags: Type.Optional(Type.Boolean()),
									verbosity: Type.Optional(StringEnum([...VERBOSITY_OPTIONS])),
									includeSections: Type.Optional(Type.Array(StringEnum([...SECTION_TAGS]))),
									excludeSections: Type.Optional(Type.Array(StringEnum([...SECTION_TAGS]))),
								}),
							],
							{ description: "Full page text as markdown. Default if no other content mode specified." },
						),
					),
					highlights: Type.Optional(
						Type.Union(
							[
								Type.Boolean(),
								Type.Object({
									maxCharacters: Type.Optional(Type.Integer()),
									query: Type.Optional(
										Type.String({ description: "Custom query to direct highlight selection." }),
									),
								}),
							],
							{ description: "Key excerpts from the page." },
						),
					),
					summary: Type.Optional(
						Type.Union(
							[
								Type.Boolean(),
								Type.Object({
									query: Type.Optional(Type.String()),
									schema: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
								}),
							],
							{ description: "LLM-generated summary, optionally structured." },
						),
					),
					livecrawl: Type.Optional(StringEnum([...LIVECRAWL_OPTIONS])),
					livecrawlTimeout: Type.Optional(Type.Integer()),
					maxAgeHours: Type.Optional(Type.Integer({ description: "0=always fresh, -1=cache only." })),
					subpages: Type.Optional(Type.Integer({ description: "Number of subpages to crawl per URL." })),
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
				const rawParams = params as RawContentsParams;

				onUpdate?.({
					content: [{ type: "text", text: `Fetching content from ${rawParams.urls.length} URL(s)...` }],
					details: { phase: "fetching", urlCount: rawParams.urls.length },
				});

				const response = await fetchContents(apiKey, rawParams, signal ?? undefined);
				const results = normalizeExaResults(response.results);

				return {
					content: [{ type: "text", text: buildContentsOutput(results) }],
					details: {
						provider: "exa",
						endpoint: "contents",
						urlCount: rawParams.urls.length,
						resultCount: results.length,
						costDollars: response.costDollars,
						statuses: response.statuses,
					},
				};
			} catch (error) {
				if (error instanceof Error) return buildErrorResult(error);
				return buildErrorResult(new Error(String(error)));
			}
		},
	};
}
