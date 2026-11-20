# AGENTS.md

## Layout

- `projects/backend/`: Bun backend (TS, ESM, decorators), Drizzle ORM.
- `projects/common/`: `@ssr/common` (builds to `dist/`).
- `projects/website/`: Next.js app. `@/*` maps to `src/*`.

## Rules

- Match existing patterns; no new abstractions without need. Keep changes scoped; no drive-by refactors.
- oxfmt owns formatting (`bun run format` from root); oxlint owns correctness.
- Never commit secrets (`.env*`, tokens, credentials, private URLs).

## TypeScript

- Strict TS: don't weaken types to compile. No function return type annotations (pin with a typed variable or `satisfies`).
- No prose comments: only TSDoc on exported API, tool directives, and single-line `// WARNING:`. Rationale goes in the commit/PR.
- No `any` or `unknown`: use concrete types.
- Throw `Error` with actionable messages; never swallow exceptions.
- Always use braces for control-flow bodies (`if (x) { y(); }`, never `if (x) y();`).

## Backend

- Tests live beside their implementation (`*.test.ts` unit, `*.integration.test.ts` DB-backed); cross-module tests in `test/integration`. Use real implementations and MSW (`test/helpers/msw-server.ts`), never mocks or stubs.
- Business logic in services; handlers stay thin; validate input at boundaries.
- No sequential awaits in loops when concurrency is safe (`Promise.all`); consider timeouts/retries for external calls.

## Database

Schema: `projects/backend/src/db/schema.ts`. Migrations: `projects/backend/drizzle/`. Types come from the schema (`InferSelectModel` / `InferInsertModel`).

When you change the schema (including indexes), from `projects/backend`:

1. `bunx drizzle-kit generate`, then commit the generated `drizzle/` files with the schema change. Indexes belong in migrations, not one-off changes on a live DB.
2. `bun run db:migrate` (needs `DATABASE_URL`), not `bunx drizzle-kit migrate`.

## Common package

- `@ssr/common` exports are stable APIs: no breaking changes without updating all consumers.
- All validation schemas live in `projects/common/src/schemas/` (by domain, TypeBox); no ad-hoc schemas elsewhere.
- Never import from `dist/` in source.

## Website

- Prefer Server Components; client components only when necessary.
- Reuse existing UI primitives (Radix, existing component styles).

## Before a PR

`bun run format` (root); `bun run lint` in backend and website; `bun run build` in common and website when relevant.
