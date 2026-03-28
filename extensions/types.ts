import type { Category, LivecrawlOption, RecencyFilter, SearchType, SectionTag, VerbosityOption } from "./constants.js";

// ── Text contents options ──

export type TextContentsOptions = {
	maxCharacters?: number;
	includeHtmlTags?: boolean;
	verbosity?: VerbosityOption;
	includeSections?: SectionTag[];
	excludeSections?: SectionTag[];
};

// ── Highlights contents options ──

export type HighlightsContentsOptions = {
	maxCharacters?: number;
	query?: string;
};

// ── Summary contents options ──

export type SummaryContentsOptions = {
	query?: string;
	schema?: Record<string, unknown>;
};

// ── Extras options ──

export type ExtrasOptions = {
	links?: number;
	imageLinks?: number;
};

// ── Contents options (nested under search/findSimilar/contents) ──

export type ContentsOptions = {
	text?: TextContentsOptions | boolean;
	highlights?: HighlightsContentsOptions | boolean;
	summary?: SummaryContentsOptions | boolean;
	livecrawl?: LivecrawlOption;
	livecrawlTimeout?: number;
	maxAgeHours?: number;
	subpages?: number;
	subpageTarget?: string | string[];
	extras?: ExtrasOptions;
};

// ── Deep search output schema ──

export type DeepTextOutputSchema = {
	type: "text";
	description?: string;
};

export type DeepObjectOutputSchema = {
	type: "object";
	properties?: Record<string, unknown>;
	required?: string[];
};

export type DeepOutputSchema = DeepTextOutputSchema | DeepObjectOutputSchema;

// ── Raw tool params (what the LLM sends) ──

export type RawToolParams = {
	query?: string;
	queries?: string[];
	numResults?: number;
	searchType?: SearchType;
	category?: Category;
	userLocation?: string;
	recencyFilter?: RecencyFilter;
	startPublishedDate?: string;
	endPublishedDate?: string;
	startCrawlDate?: string;
	endCrawlDate?: string;
	includeText?: string[];
	excludeText?: string[];
	moderation?: boolean;
	domainFilter?: string[];
	includeDomains?: string[];
	excludeDomains?: string[];
	highlightsMaxCharacters?: number;
	// Deep search params
	additionalQueries?: string[];
	systemPrompt?: string;
	outputSchema?: DeepOutputSchema;
	// Contents params
	contents?: ContentsOptions;
};

// ── Effective (normalized) search params ──

export type EffectiveSearchParams = {
	queries: string[];
	numResults: number;
	searchType: SearchType;
	category?: Category;
	userLocation?: string;
	includeDomains: string[];
	excludeDomains: string[];
	startPublishedDate?: string;
	endPublishedDate?: string;
	startCrawlDate?: string;
	endCrawlDate?: string;
	includeText?: string[];
	excludeText?: string[];
	moderation?: boolean;
	highlightsMaxCharacters: number;
	// Deep search params
	additionalQueries?: string[];
	systemPrompt?: string;
	outputSchema?: DeepOutputSchema;
	// Contents params
	contents?: ContentsOptions;
};

// ── Exa API response types ──

export type ExaEntityCompanyProperties = {
	name?: string | null;
	foundedYear?: number | null;
	description?: string | null;
	workforce?: { total?: number | null } | null;
	headquarters?: {
		address?: string | null;
		city?: string | null;
		postalCode?: string | null;
		country?: string | null;
	} | null;
	financials?: {
		revenueAnnual?: number | null;
		fundingTotal?: number | null;
		fundingLatestRound?: {
			name?: string | null;
			date?: string | null;
			amount?: number | null;
		} | null;
	} | null;
	webTraffic?: { visitsMonthly?: number | null } | null;
};

export type ExaEntityPersonProperties = {
	name?: string | null;
	location?: string | null;
	workHistory?: Array<{
		title?: string | null;
		location?: string | null;
		dates?: { from?: string | null; to?: string | null } | null;
		company?: { id?: string | null; name?: string | null } | null;
	}>;
};

export type ExaEntity =
	| { id: string; type: "company"; version: number; properties: ExaEntityCompanyProperties }
	| { id: string; type: "person"; version: number; properties: ExaEntityPersonProperties };

export type ExaApiResult = {
	title?: string;
	url?: string;
	publishedDate?: string;
	author?: string;
	highlights?: string[];
	highlightScores?: number[];
	summary?: string;
	text?: string;
	score?: number;
	id?: string;
	image?: string;
	favicon?: string;
	entities?: ExaEntity[];
	subpages?: ExaApiResult[];
	extras?: { links?: string[]; imageLinks?: string[] };
};

export type DeepSearchOutputGrounding = {
	field: string;
	citations: Array<{ url: string; title: string }>;
	confidence: "low" | "medium" | "high";
};

export type DeepSearchOutput = {
	content: string | Record<string, unknown>;
	grounding: DeepSearchOutputGrounding[];
};

export type ExaApiStatus = {
	id: string;
	status: string;
	error?: { tag?: string; httpStatusCode?: number };
};

export type NormalizedResult = {
	title: string;
	url: string;
	publishedDate?: string;
	author?: string;
	highlights: string[];
	highlightScores?: number[];
	summary?: string;
	text?: string;
	score?: number;
	id?: string;
	image?: string;
	favicon?: string;
	entities?: ExaEntity[];
	subpages?: NormalizedResult[];
	extras?: { links?: string[]; imageLinks?: string[] };
};

export type QueryRun = {
	query: string;
	requestId?: string;
	costDollars?: number;
	resolvedSearchType?: string;
	searchTime?: number;
	output?: DeepSearchOutput;
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
		resolvedSearchType?: string;
		searchTime?: number;
		output?: DeepSearchOutput;
		results: ExaApiResult[];
	}>;
}

export type ToolDeps = {
	now: () => Date;
	getApiKey: () => string;
	createClient: (apiKey: string) => ExaSearchClient;
};

// ── Contents endpoint types ──

export type RawContentsParams = {
	urls: string[];
	contents?: ContentsOptions;
};

export type EffectiveContentsParams = {
	urls: string[];
	contents: ContentsOptions;
};

// ── Find similar endpoint types ──

export type RawFindSimilarParams = {
	url: string;
	numResults?: number;
	excludeSourceDomain?: boolean;
	includeDomains?: string[];
	excludeDomains?: string[];
	startPublishedDate?: string;
	endPublishedDate?: string;
	startCrawlDate?: string;
	endCrawlDate?: string;
	category?: Category;
	includeText?: string[];
	excludeText?: string[];
	contents?: ContentsOptions;
};

// ── Answer endpoint types ──

export type RawAnswerParams = {
	query: string;
	text?: boolean;
	model?: string;
	systemPrompt?: string;
	outputSchema?: Record<string, unknown>;
	userLocation?: string;
};

export type ExaAnswerResponse = {
	answer: string | Record<string, unknown>;
	citations: ExaApiResult[];
	requestId?: string;
	costDollars?: { total?: number } | number;
};
