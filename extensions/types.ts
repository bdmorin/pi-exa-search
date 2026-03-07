import type { RecencyFilter, SearchType } from "./constants.js";

export type RawToolParams = {
	query?: string;
	queries?: string[];
	numResults?: number;
	searchType?: SearchType;
	recencyFilter?: RecencyFilter;
	startPublishedDate?: string;
	endPublishedDate?: string;
	domainFilter?: string[];
	includeDomains?: string[];
	excludeDomains?: string[];
	highlightsMaxCharacters?: number;
};

export type EffectiveSearchParams = {
	queries: string[];
	numResults: number;
	searchType: SearchType;
	includeDomains: string[];
	excludeDomains: string[];
	startPublishedDate?: string;
	endPublishedDate?: string;
	highlightsMaxCharacters: number;
};

export type ExaApiResult = {
	title?: string;
	url?: string;
	publishedDate?: string;
	author?: string;
	highlights?: string[];
	summary?: string;
	score?: number;
	id?: string;
};

export type NormalizedResult = {
	title: string;
	url: string;
	publishedDate?: string;
	author?: string;
	highlights: string[];
	summary?: string;
	score?: number;
	id?: string;
};

export type QueryRun = {
	query: string;
	requestId?: string;
	costDollars?: number;
	results: NormalizedResult[];
};

export type ExaSearchDetails = {
	provider: "exa";
	effectiveParams: EffectiveSearchParams;
	queries: QueryRun[];
};

export interface ExaSearchClient {
	search(params: { query: string; effectiveParams: EffectiveSearchParams; signal?: AbortSignal }): Promise<{
		requestId?: string;
		costDollars?: number;
		results: ExaApiResult[];
	}>;
}

export type ToolDeps = {
	now: () => Date;
	getApiKey: () => string;
	createClient: (apiKey: string) => ExaSearchClient;
};
