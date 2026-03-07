export const SEARCH_TYPES = ["auto", "neural", "instant", "deep", "deep-reasoning", "deep-max"] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];

export const RECENCY_FILTERS = ["day", "week", "month", "year"] as const;
export type RecencyFilter = (typeof RECENCY_FILTERS)[number];

export const DEFAULT_NUM_RESULTS = 5;
export const MAX_NUM_RESULTS = 10;
export const DEFAULT_HIGHLIGHTS_MAX_CHARACTERS = 800;
export const MIN_HIGHLIGHTS_MAX_CHARACTERS = 200;
export const MAX_HIGHLIGHTS_MAX_CHARACTERS = 4000;
