<p>
  <img src="https://raw.githubusercontent.com/najibninaba/pi-exa-search/main/assets/header.svg" alt="pi-exa-search banner" width="100%">
</p>

# pi-exa-search

[![Version](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/najibninaba/pi-exa-search/main/package.json&query=%24.version&label=version&style=for-the-badge)](https://github.com/najibninaba/pi-exa-search/blob/main/package.json)
[![CI](https://img.shields.io/github/actions/workflow/status/najibninaba/pi-exa-search/ci.yml?branch=main&label=CI&style=for-the-badge)](https://github.com/najibninaba/pi-exa-search/actions/workflows/ci.yml)
[![Versioning](https://img.shields.io/badge/versioning-Changesets-7C3AED?style=for-the-badge)](https://github.com/changesets/changesets)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

Exa-powered source discovery for Pi.

`pi-exa-search` works **standalone** for URL discovery and lightweight web research.

For the complete experience, pair it with [`pi-web-access`](https://github.com/nicobailon/pi-web-access) by nicobailon so Pi can follow `exa_search` with `fetch_content` for full-page extraction.

A good enhanced workflow is:

1. `exa_search` finds strong candidate URLs
2. `fetch_content` from `pi-web-access` extracts the best pages
3. Pi synthesizes the final answer or sitrep

## Why this exists

`pi-web-access` is already very good at:

- fetching and extracting page content
- handling blocked or JS-heavy pages
- storing fetched results for follow-up
- GitHub, YouTube, and video handling

This package fills a different gap:

- Exa-backed source discovery
- fresh multi-query research workflows
- domain include/exclude filtering
- recency and published-date filtering
- lightweight highlights before you decide what to fetch deeply

## Install

You can install and use `pi-exa-search` on its own.

For the complete experience, also install [`pi-web-access`](https://github.com/nicobailon/pi-web-access) by nicobailon.

### From a local path

```bash
pi install ~/Hacks/pi-exa-search
```

### From GitHub

```bash
pi install git:github.com/najibninaba/pi-exa-search
```

You can also pin a ref:

```bash
pi install git:github.com/najibninaba/pi-exa-search@main
```

This package intentionally follows the same Pi package pattern as [`pi-web-access`](https://github.com/nicobailon/pi-web-access): the package ships TypeScript extension sources under `extensions/`, and Pi loads them directly.

## Configuration

The extension reads your Exa API key from:

1. `EXA_API_KEY` environment variable
2. `~/.pi/exa-search.json`

Example config file:

```json
{
  "exaApiKey": "your-exa-api-key"
}
```

## Tool

### `exa_search`

Search the web with Exa for source discovery.

It works on its own, and pairs well with `fetch_content` from [`pi-web-access`](https://github.com/nicobailon/pi-web-access) when deeper extraction is available.

#### Parameters

- `query` or `queries`, but not both
- `numResults`
- `searchType`: `auto`, `neural`, `instant`, `deep`, `deep-reasoning`, `deep-max`
- `domainFilter`: array with normal domains to include and `-domain.com` to exclude
- `includeDomains`
- `excludeDomains`
- `recencyFilter`: `day`, `week`, `month`, `year`
- `startPublishedDate`
- `endPublishedDate`
- `highlightsMaxCharacters`

#### Behavior notes

- exactly one of `query` or `queries` must be provided
- `recencyFilter` cannot be mixed with explicit published date bounds
- date-only published date values are normalized to UTC day boundaries
- domains are validated explicitly, invalid values raise an error instead of being silently dropped

#### Examples

```ts
exa_search({ query: "latest AI regulation developments", recencyFilter: "day" })
exa_search({ queries: ["coding agent tools", "developer workflow automation", "open-source agent frameworks"], recencyFilter: "month" })
exa_search({ query: "enterprise browser security", domainFilter: ["reuters.com", "-reddit.com"] })
```

## Command

### `/exasearch <query>`

This command sends a user message that nudges Pi to:

- use `exa_search`
- select the best URLs
- use `fetch_content` if deeper extraction is needed and available

Useful when you want to force the Exa-first workflow from the command line.

If `pi-web-access` is not installed, the command is still useful for Exa-first source discovery and URL shortlisting.

## Recommended usage pattern

### Standalone

1. `exa_search`
2. review the returned URLs, highlights, and metadata
3. synthesize from those results or fetch pages with whatever other tooling you have available

### With [`pi-web-access`](https://github.com/nicobailon/pi-web-access)

1. `exa_search`
2. choose the strongest URLs
3. `fetch_content` on those URLs
4. synthesize the answer

Prompts like these work especially well:

- "get a fresh sitrep on AI regulation in Europe"
- "find recent coverage of semiconductor manufacturing trends"
- "pull together good sources on browser automation tools"

## Releases

This repo uses [Changesets](https://github.com/changesets/changesets) for versioning and changelog management.

Typical workflow:

1. Make a user-facing change
2. Run `npm run changeset`
3. Commit the generated changeset file
4. Merge to `main`
5. Let the release workflow open or update the release PR

When the release PR is merged, GitHub Actions updates the version, writes the changelog, tags the release, and publishes to npm when `NPM_TOKEN` is configured.

## Development

```bash
npm install
npm run format
npm run check
```

The repo includes:

- Biome for formatting and linting
- TypeScript for typechecking
- Vitest with coverage thresholds for tests
- GitHub Actions CI on push and pull request
