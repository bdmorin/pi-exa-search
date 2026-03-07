import { ProviderError } from "./errors.js";
import type { EffectiveSearchParams, ExaApiResult, ExaSearchClient } from "./types.js";

const EXA_SEARCH_URL = "https://api.exa.ai/search";

type ExaApiResponse = {
	requestId?: string;
	costDollars?: number | { total?: number };
	results?: ExaApiResult[];
};

function normalizeCost(costDollars: ExaApiResponse["costDollars"]): number | undefined {
	if (typeof costDollars === "number") return costDollars;
	if (typeof costDollars?.total === "number") return costDollars.total;
	return undefined;
}

export function createExaSearchClient(apiKey: string): ExaSearchClient {
	return {
		async search(params: { query: string; effectiveParams: EffectiveSearchParams; signal?: AbortSignal }) {
			const { query, effectiveParams, signal } = params;
			const response = await fetch(EXA_SEARCH_URL, {
				method: "POST",
				headers: {
					accept: "application/json",
					"content-type": "application/json",
					"x-api-key": apiKey,
				},
				body: JSON.stringify({
					query,
					type: effectiveParams.searchType,
					numResults: effectiveParams.numResults,
					...(effectiveParams.includeDomains.length > 0 ? { includeDomains: effectiveParams.includeDomains } : {}),
					...(effectiveParams.excludeDomains.length > 0 ? { excludeDomains: effectiveParams.excludeDomains } : {}),
					...(effectiveParams.startPublishedDate
						? { startPublishedDate: effectiveParams.startPublishedDate }
						: {}),
					...(effectiveParams.endPublishedDate ? { endPublishedDate: effectiveParams.endPublishedDate } : {}),
					contents: {
						highlights: {
							maxCharacters: effectiveParams.highlightsMaxCharacters,
						},
					},
				}),
				signal,
			});

			if (!response.ok) {
				const text = await response.text();
				throw new ProviderError(`Exa API error ${response.status}: ${text.slice(0, 300)}`);
			}

			let data: ExaApiResponse;
			try {
				data = (await response.json()) as ExaApiResponse;
			} catch {
				throw new ProviderError("Exa API returned invalid JSON.");
			}

			return {
				requestId: data.requestId,
				costDollars: normalizeCost(data.costDollars),
				results: Array.isArray(data.results) ? data.results : [],
			};
		},
	};
}
