# AGENTS.md

Working agreement for humans + AI agents contributing to this repo.

## Layout

- **Root**: Bun workspaces; formatting via `.prettierrc.json`.
- **`projects/backend/`**: Bun backend (TS, ESM, decorators). PostgreSQL via Drizzle ORM (`src/db/`, `drizzle/`).
- **`projects/common/`**: Shared package `@ssr/common` (builds to `dist/`).
- **`projects/website/`**: Next.js app (React 19, Next 16, Tailwind). `@/*` maps to `src/*`.

## Rules

- Match existing patterns in the file you're touching; no new abstractions without need.
- Keep changes scoped to one problem; no drive-by refactors.
- Prettier owns formatting (`bun run prettier` from root); ESLint/Next lint own correctness.
- Never commit secrets (`.env*`, tokens, credentials, private URLs).

## TypeScript

- Strict TS: don't weaken types to compile; prefer narrowing and explicit return types.
- No `any` or `unknown`: use concrete types (interfaces, unions, generics, schema-inferred types).
- Throw `Error` (or project error types) with actionable messages; never swallow exceptions.
- `camelCase` variables/functions, `PascalCase` types/classes/components; filenames follow the folder (usually kebab-case).
- Always use braces for control-flow bodies:

```ts
if (bla) bad(); // do not do

if (bla) {
  good(); // do this
}
```

## Backend

- Lint: `bun run lint` (in `projects/backend`).
- Runs on Bun; prefer Web-standard APIs.
- Business logic in services; request handlers stay thin; validate input at boundaries.
- No sequential awaits in loops when concurrency is safe (`Promise.all`); consider timeouts/retries for external calls.

## Database (Drizzle + PostgreSQL)

Schema source of truth: `projects/backend/src/db/schema.ts` (tables, indexes, partial/GIN indexes; follow existing patterns). Migrations: `projects/backend/drizzle/` (SQL + `meta/_journal.json`). Config: `drizzle.config.ts`. Applied in code by `src/db/run-migrations.ts`.

When you change the schema (including indexes), from `projects/backend`:

1. `bunx drizzle-kit generate`, then **commit the generated `drizzle/` files with the schema change**. Indexes belong in migrations, not one-off changes on a live DB.
2. `bun run db:migrate` (needs `DATABASE_URL`). Prefer it over `bunx drizzle-kit migrate`, whose TUI hides failure details.

Types come from the schema (`InferSelectModel` / `InferInsertModel`); there is no codegen step.

## Common package

- `@ssr/common` exports are stable APIs: no breaking changes without updating all consumers. Prefer small, well-typed utilities.
- **All** validation schemas live in `projects/common/src/schemas/` (by domain, TypeBox). Backend and website import them from `@ssr/common`; no ad-hoc schemas elsewhere.
- `bun run build` emits `dist/`; never import from `dist/` in source.

## Website

- Lint: `bun run lint` (in `projects/website`).
- Prefer Server Components; use client components only when necessary. Avoid expensive work in render.
- Reuse existing UI primitives (Radix, existing component styles); Tailwind ordering is handled by Prettier.

## Before a PR

`bun run prettier` (root); `bun run lint` in backend and website; `bun run build` in common and website when relevant.
