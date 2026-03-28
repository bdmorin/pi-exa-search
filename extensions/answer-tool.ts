import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

import { fetchAnswer } from "./exa-client.js";
import { buildAnswerOutput, normalizeExaResults } from "./results.js";
import { buildErrorResult } from "./tool.js";
import type { RawAnswerParams } from "./types.js";

export function createExaAnswerTool(getApiKey: () => string): Parameters<ExtensionAPI["registerTool"]>[0] {
	return {
		name: "exa_answer",
		label: "Exa Answer",
		description:
			"Get a grounded answer to a question. Exa searches the web, reads the relevant pages, and synthesizes an answer with citations. Best for factual questions where you want a direct answer backed by sources.",
		parameters: Type.Object({
			query: Type.String({ description: "The question to answer." }),
			text: Type.Optional(Type.Boolean({ description: "Include source page text in citations. Default: false." })),
			model: Type.Optional(Type.String({ description: "Model for answer generation. Default: 'exa'." })),
			systemPrompt: Type.Optional(
				Type.String({ description: "Guide the LLM's answer style (e.g. 'Answer concisely for experts')." }),
			),
			outputSchema: Type.Optional(
				Type.Record(Type.String(), Type.Unknown(), {
					description: "JSON Schema for structured answer output.",
				}),
			),
			userLocation: Type.Optional(Type.String({ description: "Two-letter ISO country code for geo-relevance." })),
		}),
		async execute(_toolCallId, params, signal, onUpdate, _ctx: ExtensionContext) {
			try {
				const apiKey = getApiKey();
				const rawParams = params as RawAnswerParams;

				onUpdate?.({
					content: [{ type: "text", text: `Searching and generating answer for: ${rawParams.query}` }],
					details: { phase: "answering", query: rawParams.query },
				});

				const response = await fetchAnswer(apiKey, rawParams, signal ?? undefined);
				const citations = normalizeExaResults(response.citations);

				return {
					content: [{ type: "text", text: buildAnswerOutput(response.answer, citations) }],
					details: {
						provider: "exa",
						endpoint: "answer",
						requestId: response.requestId,
						costDollars:
							typeof response.costDollars === "number"
								? response.costDollars
								: typeof response.costDollars === "object" && response.costDollars !== null
									? response.costDollars.total
									: undefined,
						citationCount: citations.length,
					},
				};
			} catch (error) {
				if (error instanceof Error) return buildErrorResult(error);
				return buildErrorResult(new Error(String(error)));
			}
		},
	};
}
