export const SEARCH_TYPES = [
	"auto",
	"fast",
	"instant",
	"neural",
	"keyword",
	"hybrid",
	"deep",
	"deep-reasoning",
] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];

export const DEEP_SEARCH_TYPES: readonly SearchType[] = ["deep", "deep-reasoning"] as const;

export const CATEGORIES = [
	"company",
	"people",
	"research paper",
	"news",
	"pdf",
	"personal site",
	"financial report",
] as const;
export type Category = (typeof CATEGORIES)[number];

/** Categories that restrict other filter params (no date filters, no text filters, no excludeDomains). */
export const RESTRICTED_CATEGORIES: readonly Category[] = ["company", "people"] as const;

export const RECENCY_FILTERS = ["day", "week", "month", "year"] as const;
export type RecencyFilter = (typeof RECENCY_FILTERS)[number];

export const LIVECRAWL_OPTIONS = ["never", "fallback", "always", "auto", "preferred"] as const;
export type LivecrawlOption = (typeof LIVECRAWL_OPTIONS)[number];

export const VERBOSITY_OPTIONS = ["compact", "standard", "full"] as const;
export type VerbosityOption = (typeof VERBOSITY_OPTIONS)[number];

export const SECTION_TAGS = [
	"unspecified",
	"header",
	"navigation",
	"banner",
	"body",
	"sidebar",
	"footer",
	"metadata",
] as const;
export type SectionTag = (typeof SECTION_TAGS)[number];

export const DEFAULT_NUM_RESULTS = 10;
export const MAX_NUM_RESULTS = 100;
export const DEFAULT_HIGHLIGHTS_MAX_CHARACTERS = 800;
export const MIN_HIGHLIGHTS_MAX_CHARACTERS = 200;
export const MAX_HIGHLIGHTS_MAX_CHARACTERS = 4000;

export const MAX_INCLUDE_TEXT_WORDS = 5;
export const MAX_INCLUDE_TEXT_ITEMS = 1;
export const MAX_EXCLUDE_TEXT_ITEMS = 1;
