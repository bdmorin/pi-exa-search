# pi-exa

Full Exa API coverage for [Pi](https://github.com/mariozechner/pi-coding-agent).

> **Hard fork of [`pi-exa-search`](https://github.com/najibninaba/pi-exa-search) by [najibninaba](https://github.com/najibninaba).** The original extension is a clean, well-tested implementation of Exa's search endpoint with highlights. This fork expands coverage to the full Exa API — all four endpoints, all search parameters, structured output, entity extraction, and evidence-backed skill guidance. Props to najibninaba for the solid foundation.

## What changed from upstream

| | upstream `pi-exa-search` | this fork `pi-exa` |
|---|---|---|
| **Endpoints** | `/search` (highlights only) | `/search`, `/contents`, `/findSimilar`, `/answer` |
| **Tools** | `exa_search` | `exa_search`, `exa_contents`, `exa_find_similar`, `exa_answer` |
| **Search params** | query, domains, dates, search type, highlights | + category, includeText/excludeText, crawl dates, userLocation, moderation, deep search (systemPrompt, outputSchema, additionalQueries) |
| **Content modes** | highlights only | text, highlights (with custom query), summary (with JSON schema), livecrawl, subpages, extras |
| **Search types** | auto, neural, instant, deep, deep-reasoning, deep-max | auto, fast, instant, neural, keyword, hybrid, deep, deep-reasoning (dropped deprecated deep-max) |
| **Response fields** | title, url, date, author, highlights, summary, score | + image, favicon, highlightScores, entities (company/people), subpages, extras, deep search output with grounding/citations, resolvedSearchType, searchTime |
| **numResults** | default 5, max 10 | default 10, max 100 |
| **Unit tests** | 33 | 84 |
| **Integration tests** | — | 21 (real Exa API) |

## Tools

### `exa_search` — Find sources

Search the web with Exa. Supports all search types, category filters, content modes, deep search with structured output.

```ts
exa_search({ query: "latest AI regulation", recencyFilter: "week" })
exa_search({ queries: ["coding agents", "developer workflow automation"], category: "news" })
exa_search({ query: "top aerospace companies", searchType: "deep", outputSchema: { type: "object", properties: { companies: { type: "array" } } } })
exa_search({ query: "transformer architecture", category: "research paper", contents: { text: { maxCharacters: 5000 } } })
exa_search({ query: "Exa AI", category: "company" })  // returns structured entity data
```

### `exa_contents` — Extract from known URLs

Fetch clean text, highlights, or summaries from URLs you already have. Handles JS-rendered pages, PDFs, complex layouts server-side.

```ts
exa_contents({ urls: ["https://example.com/article"], contents: { text: { maxCharacters: 10000 } } })
exa_contents({ urls: ["https://docs.example.com"], contents: { summary: true, subpages: 10, subpageTarget: "api" } })
```

### `exa_find_similar` — Snowball research

Find pages similar to a given URL. Great for discovering more sources after finding one good one.

```ts
exa_find_similar({ url: "https://example.com/great-article", excludeSourceDomain: true, numResults: 10 })
```

### `exa_answer` — Grounded answers

Ask a factual question, get an answer with citations. Exa searches, reads pages, synthesizes.

```ts
exa_answer({ query: "What caused the 2008 financial crisis?" })
exa_answer({ query: "Compare React and Vue", systemPrompt: "Answer concisely for senior developers" })
```

### `/exasearch <query>` — Command

Nudges Pi to use Exa-first workflow from the command line.

## Install

```bash
pi install git:github.com/bdmorin/pi-exa-search@main
```

For the complete experience with `fetch_content` fallbacks, also install [`pi-web-access`](https://github.com/nicobailon/pi-web-access):

```bash
pi install npm:pi-web-access
```

## Configuration

The extension reads your Exa API key from:

1. `EXA_API_KEY` environment variable (recommended — set in mise)
2. `~/.pi/exa-search.json` with `{ "exaApiKey": "your-key" }`

Get a key at [dashboard.exa.ai/api-keys](https://dashboard.exa.ai/api-keys).

## Search type performance (measured)

| Type | Latency | Best for |
|---|---|---|
| `instant` | ~170ms | Real-time apps, chat, voice |
| `fast` | ~770ms | Speed with minimal quality sacrifice |
| `auto` | ~800ms | Default. Balanced quality and speed. |
| `deep` | 5-60s | Complex queries, structured extraction |
| `deep-reasoning` | 5-60s | Maximum reasoning depth |

## Category filters

| Category | What it covers |
|---|---|
| `company` | 50M+ companies with structured entity data |
| `people` | 1B+ people with work history, education |
| `research paper` | 100M+ academic papers |
| `news` | Current events, journalism |
| `personal site` | Blogs, personal pages |
| `financial report` | SEC filings, earnings |
| `pdf` | PDF documents |

**Note:** `company` and `people` categories do NOT support date filters, text filters, or `excludeDomains`.

## Content modes

| Mode | Tokens | Best for |
|---|---|---|
| `highlights` | 10x fewer | Agent workflows, factual lookups. Recommended `maxCharacters: 4000`. |
| `text` | Full page | Deep analysis, complete context |
| `summary` | Compact | Quick overviews, structured extraction with JSON schema |

## Development

```bash
npm install
npm run check          # biome + typecheck + tests (84 unit tests)
npm run test:integration  # real API tests (requires EXA_API_KEY)
```

## Upstream

This is a hard fork of [`najibninaba/pi-exa-search`](https://github.com/najibninaba/pi-exa-search). The upstream project provides a focused, well-tested search-with-highlights tool. This fork diverges significantly by covering the full Exa API surface. We've offered to upstream these changes — see the discussion on the original repo.

## License

[MIT](LICENSE)
