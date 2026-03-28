---
name: exa-web-research
description: Use Exa for source discovery, content extraction, similarity research, and grounded answers. Four tools covering the full Exa API.
---

# Exa Web Research

You have four Exa tools available. Use the right one for the job.

## Tools

### `exa_search` — Find sources
Search the web with Exa. Best for source discovery, multi-angle research, fresh sitreps.

### `exa_contents` — Extract from known URLs
Fetch clean text, highlights, or summaries from URLs you already have. Handles JS-rendered pages, PDFs, complex layouts. Use instead of `fetch_content` when Exa extraction is sufficient.

### `exa_find_similar` — Snowball research
Find pages similar to a given URL. Great after finding one good source — discover more like it.

### `exa_answer` — Grounded answers
Ask a factual question, get an answer with citations. Exa searches, reads pages, and synthesizes.

## When to use what

| Need | Tool |
|---|---|
| Find sources on a topic | `exa_search` |
| Extract content from specific URLs | `exa_contents` |
| "More like this" from a known good page | `exa_find_similar` |
| Direct answer with citations | `exa_answer` |
| Fresh sitrep / "latest on X" | `exa_search` with `recencyFilter` |
| Structured data extraction | `exa_search` with `type: "deep"` + `outputSchema` |
| Company/people research | `exa_search` with `category: "company"` or `"people"` |

## Search type guidance (measured latency)

| Type | Latency | Best for |
|---|---|---|
| `auto` | ~800ms | Default. Good quality, reasonable speed. |
| `fast` | ~770ms | Similar to auto but optimized path. |
| `instant` | ~170ms | Real-time apps, chat, voice. Fastest. |
| `deep` | 5-60s | Complex queries with reasoning and structured output. |
| `deep-reasoning` | 5-60s | Maximum reasoning depth. |

Use `instant` when latency matters more than quality. Use `deep` when you need structured extraction or multi-step reasoning.

## Content mode guidance

| Mode | Tokens | Best for |
|---|---|---|
| `highlights` | 10x fewer | Agent workflows, factual lookups. Default. Recommended `maxCharacters: 4000`. |
| `text` | Full page | Deep analysis, when you need complete context. |
| `summary` | Compact | Quick overviews, structured extraction with JSON schema. |

You can combine modes: request both highlights and text in one call.

## Category filters

Categories focus search on specific data types with higher data quality:

- `company` — 50M+ company pages. Returns structured `entities` with name, founded year, financials, workforce, headquarters.
- `people` — 1B+ people. Returns structured `entities` with name, location, work history.
- `research paper` — 100M+ full papers.
- `news` — Current events, journalism.
- `personal site` — Blogs, personal pages.
- `financial report` — SEC filings, earnings.
- `pdf` — PDF documents.

**Restrictions:** `company` and `people` do NOT support: date filters, text filters, or `excludeDomains`. Using them causes a 400 error.

## Key parameters

- `includeText` / `excludeText` — Content-level string matching. Max 1 string, 5 words each. Tightens results.
- `contents.maxAgeHours` — Cache freshness. `0` = always livecrawl (slowest, freshest). `-1` = cache only (fastest). Omit for default.
- `contents.subpages` — Crawl linked subpages from results. Good for docs sites.
- `contents.extras.links` / `imageLinks` — Extract links or images from pages.
- `numResults` — Default 10, max 100. Pull more when comprehensive coverage matters.
- `outputSchema` — Deep search only. Extract structured JSON. Max depth 2, max 10 properties.

## Recommended workflows

### Fresh sitrep
1. `exa_search` with `recencyFilter: "day"` or `"week"`
2. Review highlights
3. `exa_contents` or `fetch_content` on best URLs for full extraction
4. Synthesize

### Deep research
1. `exa_search` with multiple `queries` for different angles
2. `exa_find_similar` on the best result to discover more
3. `exa_contents` on the full URL set
4. Synthesize with full context

### Structured extraction
1. `exa_search` with `type: "deep"` and `outputSchema`
2. Exa returns structured JSON with grounding citations
3. Use directly or combine with other sources

### Company/people research
1. `exa_search` with `category: "company"` or `"people"`
2. Results include structured `entities` with metadata
3. Optionally `exa_contents` for deeper page extraction

## Guidance

- Provide exactly one of `query` or `queries` to `exa_search`
- Do not mix `recencyFilter` with explicit published date bounds
- Category `company`/`people` restricts many filters — don't add date or text filters
- `outputSchema` only works with `type: "deep"` or `type: "deep-reasoning"`
- Use Exa highlights to shortlist URLs, then fetch full content when needed
- If `pi-web-access` is installed, `fetch_content` is still useful for pages that need JS rendering beyond what Exa provides
