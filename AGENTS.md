# AGENTS.md

This file is the working agreement for humans + AI agents contributing to this repo.

## Repo layout

- **Root**: Bun workspaces, shared formatting via `.prettierrc.json`.
- **`projects/backend/`**: Bun runtime backend (TypeScript, ESM, decorators enabled).
- **`projects/common/`**: Shared TS package `@ssr/common` (builds to `dist/`).
- **`projects/website/`**: Next.js app (React 19, Next 16, Tailwind).

## The golden rules

- **Match existing patterns**: Prefer extending the local conventions in the file you’re touching over introducing new abstractions.
- **Keep changes scoped**: One change-set should solve one problem; avoid drive-by refactors.
- **Don’t fight tooling**: Prettier is the source of truth for formatting; ESLint/Next lint for correctness.
- **No secrets in git**: Never commit `.env*`, tokens, credentials, or private URLs.

## Formatting (Prettier)

- **Run formatting**: `bun run prettier` (from repo root).
- **Configured behaviors** (see `.prettierrc.json`):
  - Semicolons, 2-space indentation, `printWidth: 110`
  - Import organization via `prettier-plugin-organize-imports`
  - Tailwind class sorting via `prettier-plugin-tailwindcss`

## TypeScript style guide (all projects)

- **Strict TS**: Don’t weaken types to “get it to compile”. Prefer narrowing, proper return types, and typed helpers.
- **Avoid `any`**: Allowed in `website` lint config, but still prefer `unknown` + refinement, or a real type.
- **Error handling**:
  - Throw `Error` (or project-specific error types) with actionable messages.
  - Don’t swallow exceptions silently.
- **Naming**:
  - `camelCase` for variables/functions, `PascalCase` for types/classes/components.
  - File names: follow the surrounding folder convention (this repo commonly uses kebab-case in TS/TSX filenames).
- **Braces for control flow**: Use a block for `if` / loop bodies (and similar). Do not put the body on the same line as the condition without braces.

```ts
if (bla) bad(); // do not do

if (bla) {
  good(); // do this
}
```

## Imports

- **Prefer ESM imports**: This repo is largely `moduleResolution: "bundler"` and ESM-friendly.
- **Keep imports tidy**: Let Prettier organize; don’t hand-sort unless necessary.
- **Website path alias**: In `projects/website`, `@/*` maps to `projects/website/src/*`.

## Backend (`projects/backend/`) guidelines

- **Lint**: `bun run lint` (from `projects/backend`).
- **Runtime assumptions**: Code runs on Bun; prefer Web-standard APIs when available.
- **HTTP / services**:
  - Keep business logic in services; keep request handlers thin.
  - Prefer explicit input validation at boundaries (especially for request params/body).
- **Async**:
  - Avoid sequential awaits inside loops when concurrency is safe; prefer batching with `Promise.all`.
  - Always consider timeouts/retries for external calls.

## Common package (`projects/common/`) guidelines

- **Public API discipline**:
  - Treat `@ssr/common` exports as stable APIs: avoid breaking changes unless you update all consumers.
  - Prefer small, well-typed utilities over “kitchen sink” modules.
- **Build**:
  - `bun run build` emits `dist/` (types + JS). Don’t import from `dist/` in source; import from the package path.

## Website (`projects/website/`) guidelines

- **Lint**: `bun run lint` (from `projects/website`).
- **Next.js conventions**:
  - Prefer Server Components by default where the codebase already uses them; only opt into client components when necessary.
  - Avoid expensive work in render; memoize or move to data-fetching boundaries where appropriate.
- **UI**:
  - Keep Tailwind class lists readable; rely on the Tailwind Prettier plugin for ordering.
  - Prefer existing UI primitives/patterns already used in the app (Radix, existing component styles).

## Before opening a PR

- **Format**: `bun run prettier` (root).
- **Lint**:
  - Backend: `bun run lint` in `projects/backend`
  - Website: `bun run lint` in `projects/website`
- **Build sanity** (when relevant):
  - Common: `bun run build` in `projects/common`
  - Website: `bun run build` in `projects/website`
