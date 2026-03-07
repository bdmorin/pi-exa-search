---
name: exa-web-research
description: Use Exa for source discovery and multi-angle web research. Best for fresh topics, source hunting, and shortlisting high-quality URLs before deeper extraction.
---

# Exa Web Research

Use `exa_search` for **source discovery**.

If `fetch_content` is available through `pi-web-access`, use it for **full-page extraction** after shortlisting the best URLs.

This skill is for workflows where current, relevant, high-quality sources matter more than getting an immediate one-shot answer from a search provider.

## When to use

Prefer this pattern for:

- fresh sitreps
- "latest on X" requests
- source hunting
- multi-angle research
- finding primary or reputable secondary coverage before synthesis

## Recommended workflow

1. Use `exa_search` with one or more well-chosen queries
2. Prefer `recencyFilter` for time-sensitive requests
3. Use `domainFilter`, `includeDomains`, or `excludeDomains` to shape the source set
4. Review Exa results and choose the best URLs
5. If `fetch_content` is available, use it on the best 3 to 6 URLs
6. Synthesize from fetched content when available, otherwise synthesize carefully from the Exa results and any other retrieval tools you have

## Guidance

- Provide exactly one of `query` or `queries`
- Do not mix `recencyFilter` with explicit published date bounds
- Use Exa highlights to shortlist URLs, not as the final evidence base
- If `fetch_content` is available, use it for the actual article text before writing a briefing
- Call out source coverage clearly in the final answer
- If `pi-web-access` is installed, rely on its `fetch_content` fallbacks when a page is blocked or thin
