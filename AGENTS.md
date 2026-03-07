# AGENTS.md

Guidance for coding agents working in `pi-exa-search`.

## Repo purpose

This repository ships a Pi package that adds:

- the `exa_search` tool
- the `/exasearch` command
- the `exa-web-research` skill

The package is TypeScript-first and intentionally ships source files under `extensions/` and `skills/` directly. There is **no build step** and no generated `dist/` output.

## High-level layout

- `extensions/index.ts` — extension entrypoint; registers the tool and command
- `extensions/tool.ts` — `exa_search` tool schema and execution flow
- `extensions/params.ts` — parameter normalization and validation logic
- `extensions/exa-client.ts` — Exa API client and provider error handling
- `extensions/results.ts` — output/result formatting for the tool
- `extensions/config.ts` — API key/config resolution from env or `~/.pi/exa-search.json`
- `extensions/constants.ts` — shared enum/default/bounds constants
- `extensions/errors.ts` — `ValidationError`, `ConfigError`, `ProviderError`
- `extensions/types.ts` — shared types and tool/client contracts
- `extensions/command.ts` — `/exasearch` command behavior
- `skills/exa-web-research/SKILL.md` — guidance for Exa-first research workflows
- `test/*.spec.ts` — Vitest coverage for each module
- `.github/workflows/ci.yml` — CI validation
- `.github/workflows/release.yml` — release-readiness workflow
- `scripts/release-dry-run.mjs` — local publish dry-run helper
- `scripts/release-github.mjs` — local GitHub Release creation helper
- `Makefile` — thin DX wrapper around npm scripts
- `README.md` — user-facing install, usage, and release documentation

## Architecture and change map

When changing behavior, prefer touching the narrowest file responsible for it:

- **Tool parameter rules** → `extensions/params.ts` + corresponding tests in `test/params.spec.ts`
- **Exa request/response translation** → `extensions/exa-client.ts` + `test/exa-client.spec.ts`
- **Rendered tool output** → `extensions/results.ts` + `test/results.spec.ts`
- **Tool registration/schema/execution flow** → `extensions/tool.ts` + `test/tool.spec.ts`
- **Command wording/queueing behavior** → `extensions/command.ts` + `test/command.spec.ts`
- **Config/API key lookup** → `extensions/config.ts` + `test/config.spec.ts`
- **Extension wiring** → `extensions/index.ts` + `test/index.spec.ts`
- **Release ergonomics** → `Makefile`, `scripts/`, `README.md`, and possibly `.github/workflows/release.yml`
- **Skill wording** → `skills/exa-web-research/SKILL.md`

## Project conventions

- Use **ESM** imports.
- In TypeScript source, local imports use the `.js` extension (NodeNext style).
- Keep logic small and composable; validation, provider calls, formatting, and registration are intentionally separated.
- Preserve structured errors and stable error codes.
- Prefer updating constants in `extensions/constants.ts` instead of hardcoding values in multiple places.
- Formatting is handled by Biome.
- Indentation style is **tabs** (`biome.json`).
- TypeScript is strict and `noEmit`.

## Required validation for code changes

Run the canonical checks before finishing:

```bash
npm run check
```

This runs:

- Biome checks
- TypeScript typecheck
- Vitest test suite with coverage thresholds

Useful individual commands:

```bash
npm run format
npm run lint
npm run typecheck
npm run test
npm run release:dry-run
npm run release:github
```

Equivalent `make` wrappers exist:

```bash
make help
make check
make release-dry-run
make version-packages
make release
make release-github
```

## Release workflow

This repo uses Changesets for versioning, but publishing is local/manual from a trusted machine.

Typical release flow:

```bash
npm run check
npm run version-packages
git commit -am "chore: release vX.Y.Z"
git push origin main
npm publish --access public
npm run release:github
```

Or use the convenience target after the version bump commit has already been pushed:

```bash
make release
```

`npm run release:github` / `make release-github` requires:

- `gh` installed
- `gh auth login` completed
- clean git worktree

## Agent workflow recommendations

1. Read `README.md` and the most relevant files in `extensions/` before making behavior changes.
2. Read the matching test file before editing a module.
3. Keep changes minimal and localized.
4. If you change user-visible behavior, update `README.md` and tests in the same change.
5. If you change release or developer workflow, update `README.md` and `Makefile` together.
6. Do not edit `package-lock.json` unless dependencies actually change.
7. Do not add a build pipeline unless explicitly requested; this package is meant to ship source files directly.
8. Do not commit or tag releases unless explicitly asked.

## Common pitfalls

- Do not provide both `query` and `queries`.
- Do not mix `recencyFilter` with explicit published date bounds.
- Domain include/exclude validation is strict; preserve that behavior unless intentionally changing the public contract.
- Tool output shape and `details` payload are tested; update tests when changing them.
- Coverage thresholds are enforced in Vitest config.

## Good default checklist for most tasks

- inspect relevant source file(s)
- inspect matching spec file(s)
- make the minimal change
- update docs if behavior changed
- run `npm run check`
- summarize changed files and any follow-up steps
