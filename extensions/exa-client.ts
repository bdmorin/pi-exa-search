import { ProviderError } from "./errors.js";
import type {
	ContentsOptions,
	DeepSearchOutput,
	EffectiveSearchParams,
	ExaAnswerResponse,
	ExaApiResult,
	ExaApiStatus,
	ExaSearchClient,
	RawAnswerParams,
	RawContentsParams,
	RawFindSimilarParams,
} from "./types.js";

const EXA_BASE_URL = "https://api.exa.ai";

type ExaApiResponse = {
	requestId?: string;
	costDollars?: number | { total?: number };
	resolvedSearchType?: string;
	searchTime?: number;
	results?: ExaApiResult[];
	output?: DeepSearchOutput;
	statuses?: ExaApiStatus[];
};

type ExaAnswerApiResponse = {
	answer?: string | Record<string, unknown>;
	citations?: ExaApiResult[];
	requestId?: string;
	costDollars?: number | { total?: number };
};

function normalizeCost(costDollars: ExaApiResponse["costDollars"]): number | undefined {
	if (typeof costDollars === "number") return costDollars;
	if (typeof costDollars?.total === "number") return costDollars.total;
	return undefined;
}

function buildContentsPayload(
	contents: ContentsOptions | undefined,
	highlightsMaxCharacters: number,
): Record<string, unknown> {
	// If explicit contents options are provided, use them
	if (contents) {
		const payload: Record<string, unknown> = {};

		if (contents.text !== undefined) {
			payload.text = contents.text === true ? {} : contents.text;
		}
		if (contents.highlights !== undefined) {
			if (contents.highlights === true || contents.highlights === false) {
				if (contents.highlights) payload.highlights = { maxCharacters: highlightsMaxCharacters };
			} else {
				payload.highlights = {
					maxCharacters: contents.highlights.maxCharacters ?? highlightsMaxCharacters,
					...(contents.highlights.query ? { query: contents.highlights.query } : {}),
				};
			}
		}
		if (contents.summary !== undefined) {
			payload.summary = contents.summary === true ? {} : contents.summary;
		}
		if (contents.livecrawl !== undefined) payload.livecrawl = contents.livecrawl;
		if (contents.livecrawlTimeout !== undefined) payload.livecrawlTimeout = contents.livecrawlTimeout;
		if (contents.maxAgeHours !== undefined) payload.maxAgeHours = contents.maxAgeHours;
		if (contents.subpages !== undefined) payload.subpages = contents.subpages;
		if (contents.subpageTarget !== undefined) payload.subpageTarget = contents.subpageTarget;
		if (contents.extras !== undefined) payload.extras = contents.extras;

		// If no content mode was specified, default to highlights
		if (!payload.text && !payload.highlights && !payload.summary) {
			payload.highlights = { maxCharacters: highlightsMaxCharacters };
		}

		return payload;
	}

	// Default: highlights only (backward compatible)
	return {
		highlights: {
			maxCharacters: highlightsMaxCharacters,
		},
	};
}

async function exaFetch(
	url: string,
	apiKey: string,
	body: Record<string, unknown>,
	signal?: AbortSignal,
): Promise<unknown> {
	const response = await fetch(url, {
		method: "POST",
		headers: {
			accept: "application/json",
			"content-type": "application/json",
			"x-api-key": apiKey,
		},
		body: JSON.stringify(body),
		signal,
	});

	if (!response.ok) {
		const text = await response.text();
		throw new ProviderError(`Exa API error ${response.status}: ${text.slice(0, 300)}`);
	}

	try {
		return await response.json();
	} catch {
		throw new ProviderError("Exa API returned invalid JSON.");
	}
}

export function createExaSearchClient(apiKey: string): ExaSearchClient {
	return {
		async search(params: { query: string; effectiveParams: EffectiveSearchParams; signal?: AbortSignal }) {
			const { query, effectiveParams, signal } = params;
			const body: Record<string, unknown> = {
				query,
				type: effectiveParams.searchType,
				numResults: effectiveParams.numResults,
				...(effectiveParams.category ? { category: effectiveParams.category } : {}),
				...(effectiveParams.userLocation ? { userLocation: effectiveParams.userLocation } : {}),
				...(effectiveParams.includeDomains.length > 0 ? { includeDomains: effectiveParams.includeDomains } : {}),
				...(effectiveParams.excludeDomains.length > 0 ? { excludeDomains: effectiveParams.excludeDomains } : {}),
				...(effectiveParams.startPublishedDate ? { startPublishedDate: effectiveParams.startPublishedDate } : {}),
				...(effectiveParams.endPublishedDate ? { endPublishedDate: effectiveParams.endPublishedDate } : {}),
				...(effectiveParams.startCrawlDate ? { startCrawlDate: effectiveParams.startCrawlDate } : {}),
				...(effectiveParams.endCrawlDate ? { endCrawlDate: effectiveParams.endCrawlDate } : {}),
				...(effectiveParams.includeText?.length ? { includeText: effectiveParams.includeText } : {}),
				...(effectiveParams.excludeText?.length ? { excludeText: effectiveParams.excludeText } : {}),
				...(effectiveParams.moderation ? { moderation: true } : {}),
				...(effectiveParams.additionalQueries?.length
					? { additionalQueries: effectiveParams.additionalQueries }
					: {}),
				...(effectiveParams.systemPrompt ? { systemPrompt: effectiveParams.systemPrompt } : {}),
				...(effectiveParams.outputSchema ? { outputSchema: effectiveParams.outputSchema } : {}),
				contents: buildContentsPayload(effectiveParams.contents, effectiveParams.highlightsMaxCharacters),
			};

			const data = (await exaFetch(`${EXA_BASE_URL}/search`, apiKey, body, signal)) as ExaApiResponse;

			return {
				requestId: data.requestId,
				costDollars: normalizeCost(data.costDollars),
				resolvedSearchType: data.resolvedSearchType,
				searchTime: data.searchTime,
				output: data.output,
				results: Array.isArray(data.results) ? data.results : [],
			};
		},
	};
}

// ── Contents endpoint client ──

export async function fetchContents(
	apiKey: string,
	params: RawContentsParams,
	signal?: AbortSignal,
): Promise<{ results: ExaApiResult[]; statuses?: ExaApiStatus[]; costDollars?: number }> {
	const body: Record<string, unknown> = {
		urls: params.urls,
	};

	if (params.contents) {
		const c = params.contents;
		if (c.text !== undefined) body.text = c.text === true ? {} : c.text;
		if (c.highlights !== undefined) body.highlights = c.highlights === true ? {} : c.highlights;
		if (c.summary !== undefined) body.summary = c.summary === true ? {} : c.summary;
		if (c.livecrawl !== undefined) body.livecrawl = c.livecrawl;
		if (c.livecrawlTimeout !== undefined) body.livecrawlTimeout = c.livecrawlTimeout;
		if (c.maxAgeHours !== undefined) body.maxAgeHours = c.maxAgeHours;
		if (c.subpages !== undefined) body.subpages = c.subpages;
		if (c.subpageTarget !== undefined) body.subpageTarget = c.subpageTarget;
		if (c.extras !== undefined) body.extras = c.extras;
	} else {
		// Default to text extraction
		body.text = { maxCharacters: 10000 };
	}

	const data = (await exaFetch(`${EXA_BASE_URL}/contents`, apiKey, body, signal)) as ExaApiResponse;

	return {
		results: Array.isArray(data.results) ? data.results : [],
		statuses: data.statuses,
		costDollars: normalizeCost(data.costDollars),
	};
}

// ── Find similar endpoint client ──

export async function fetchFindSimilar(
	apiKey: string,
	params: RawFindSimilarParams,
	signal?: AbortSignal,
): Promise<{ results: ExaApiResult[]; costDollars?: number }> {
	const body: Record<string, unknown> = {
		url: params.url,
		...(params.numResults ? { numResults: params.numResults } : {}),
		...(params.excludeSourceDomain !== undefined ? { excludeSourceDomain: params.excludeSourceDomain } : {}),
		...(params.includeDomains?.length ? { includeDomains: params.includeDomains } : {}),
		...(params.excludeDomains?.length ? { excludeDomains: params.excludeDomains } : {}),
		...(params.startPublishedDate ? { startPublishedDate: params.startPublishedDate } : {}),
		...(params.endPublishedDate ? { endPublishedDate: params.endPublishedDate } : {}),
		...(params.startCrawlDate ? { startCrawlDate: params.startCrawlDate } : {}),
		...(params.endCrawlDate ? { endCrawlDate: params.endCrawlDate } : {}),
		...(params.category ? { category: params.category } : {}),
		...(params.includeText?.length ? { includeText: params.includeText } : {}),
		...(params.excludeText?.length ? { excludeText: params.excludeText } : {}),
	};

	if (params.contents) {
		const c = params.contents;
		const contents: Record<string, unknown> = {};
		if (c.text !== undefined) contents.text = c.text === true ? {} : c.text;
		if (c.highlights !== undefined) contents.highlights = c.highlights === true ? {} : c.highlights;
		if (c.summary !== undefined) contents.summary = c.summary === true ? {} : c.summary;
		if (c.livecrawl !== undefined) contents.livecrawl = c.livecrawl;
		if (c.livecrawlTimeout !== undefined) contents.livecrawlTimeout = c.livecrawlTimeout;
		if (c.maxAgeHours !== undefined) contents.maxAgeHours = c.maxAgeHours;
		if (c.subpages !== undefined) contents.subpages = c.subpages;
		if (c.subpageTarget !== undefined) contents.subpageTarget = c.subpageTarget;
		if (c.extras !== undefined) contents.extras = c.extras;
		body.contents = contents;
	} else {
		body.contents = { text: { maxCharacters: 10000 } };
	}

	const data = (await exaFetch(`${EXA_BASE_URL}/findSimilar`, apiKey, body, signal)) as ExaApiResponse;

	return {
		results: Array.isArray(data.results) ? data.results : [],
		costDollars: normalizeCost(data.costDollars),
	};
}

// ── Answer endpoint client ──

export async function fetchAnswer(
	apiKey: string,
	params: RawAnswerParams,
	signal?: AbortSignal,
): Promise<ExaAnswerResponse> {
	const body: Record<string, unknown> = {
		query: params.query,
		stream: false,
		text: params.text ?? false,
		model: params.model ?? "exa",
		...(params.systemPrompt ? { systemPrompt: params.systemPrompt } : {}),
		...(params.outputSchema ? { outputSchema: params.outputSchema } : {}),
		...(params.userLocation ? { userLocation: params.userLocation } : {}),
	};

	const data = (await exaFetch(`${EXA_BASE_URL}/answer`, apiKey, body, signal)) as ExaAnswerApiResponse;

	return {
		answer: data.answer ?? "",
		citations: Array.isArray(data.citations) ? data.citations : [],
		requestId: data.requestId,
		costDollars: data.costDollars,
	};
}
