# SQL migration plan (MongoDB → relational database)

This document lists what would need to change in this repository to move **persistent application data** from **MongoDB** (Mongoose + Typegoose) to a **SQL** database (e.g. PostgreSQL). It is a planning checklist, not an endorsement of a specific SQL engine or ORM.

**Scope note:** **Redis** (`ioredis`) is used for caching, queues, and ephemeral metrics. A “SQL migration” here means replacing **MongoDB** as the system of record. Redis can remain as-is unless you explicitly want to consolidate or remove it.

---

## 1. Current state (what you are replacing)

| Layer             | Technology                                                                                                                | Role                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Primary datastore | MongoDB                                                                                                                   | Documents, indexes, aggregation pipelines              |
| ODM               | Mongoose 9 + **Typegoose** (`@typegoose/typegoose`)                                                                       | Schema classes, models, indexes                        |
| IDs               | String `_id` on players; numeric `_id` on scores via **`@typegoose/auto-increment`** backed by an `increments` collection | Non-trivial to mirror in SQL                           |
| Secondary         | Redis                                                                                                                     | Cache, job queues, daily uniques, etc. — **not Mongo** |

**Bootstrap / teardown:** `projects/backend/src/index.ts` connects with `mongoose.connect(env.MONGO_CONNECTION_STRING)` and disconnects on shutdown.

**Environment:** `projects/common/src/env.ts` requires `MONGO_CONNECTION_STRING`. This would become something like `DATABASE_URL` (or driver-specific connection settings).

---

## 2. MongoDB collections to map to tables

These map 1:1 to Typegoose `schemaOptions.collection` (or implied) names:

| Collection                           | Primary model location                                                 | Notes                                                              |
| ------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `players`                            | `projects/common/src/model/player/player.ts`                           | Text index on `name`, compound indexes for rankings                |
| `player-history`                     | `projects/common/src/model/player/player-history-entry.ts`             | History entries, bulk writes                                       |
| `scoresaber-scores`                  | `projects/common/src/model/score/impl/scoresaber-score.ts`             | Largest volume; heavy queries & aggregates                         |
| `scoresaber-previous-scores`         | `projects/common/src/model/score/impl/scoresaber-previous-score.ts`    | Auto-increment `_id`                                               |
| `scoresaber-medals-scores`           | `projects/common/src/model/score/impl/scoresaber-medals-score.ts`      | Auto-increment                                                     |
| `additional-score-data`              | `projects/common/src/model/beatleader-score/beatleader-score.ts`       | BeatLeader enrichment                                              |
| `beatleader-score-stats`             | `projects/common/src/model/score-stats/score-stats.ts`                 |                                                                    |
| `scoresaber-leaderboards`            | `projects/common/src/model/leaderboard/impl/scoresaber-leaderboard.ts` |                                                                    |
| `scoresaber-leaderboard-star-change` | `projects/common/src/model/leaderboard/leaderboard-star-change.ts`     |                                                                    |
| `beatsaver-maps`                     | `projects/common/src/model/beatsaver/map.ts`                           |                                                                    |
| `playlists`                          | `projects/common/src/playlist/playlist.ts`                             |                                                                    |
| `metrics`                            | `projects/backend/src/common/model/metric.ts`                          | Metric snapshots                                                   |
| `discord-users`                      | `projects/backend/src/common/model/discord-user.ts`                    |                                                                    |
| `increments`                         | Used by auto-increment plugin for scores                               | Replace with SQL `SERIAL`/`IDENTITY` or application-side sequences |

You will need a **schema design** pass: normalize nested documents, decide JSON/JSONB columns vs. child tables, foreign keys, and uniqueness constraints (e.g. `scoreId`).

---

## 3. `projects/common` — models and shared types

### 3.1 Remove or isolate Mongoose/Typegoose

- **Typegoose classes** (`@modelOptions`, `@prop`, `@index`, `getModelForClass`, plugins): replace with **SQL schema definitions** (Drizzle/Prisma/Kysely schema files, or hand-written migrations) and plain TypeScript **types** for API/serialization.
- **`Document` from `mongoose`**: remove from domain types; use row types from your ORM or explicit interfaces.
- **`@typegoose/auto-increment`**: replace with database-native identity columns or a single `sequences` table; update all code that assumes Mongo numeric `_id` generation.

### 3.2 Package surface

- Anything exported from `@ssr/common` that currently re-exports **models** (`*Model`) must switch to **repositories**, **DTOs**, or **generated types** so the website and backend do not depend on Mongoose at runtime.
- **`projects/common/package.json`**: drop `mongoose`, `@typegoose/typegoose`, `@typegoose/auto-increment` when nothing in `common` imports them.

### 3.3 Build

- `bun run build` for `common` should still emit `dist/` without bundling a Mongo driver unless you intentionally keep a thin DB adapter in common (usually **avoid** — keep DB access in `backend`).

---

## 4. `projects/backend` — application code

### 4.1 Connection and lifecycle

- **`src/index.ts`**: replace `mongoose.connect` / `disconnect` with SQL pool creation/teardown (e.g. `pg` Pool, Drizzle disconnect, Prisma `$disconnect`).
- Add **health checks** and **graceful shutdown** for the SQL pool (similar to existing Mongo/Redis handling).

### 4.2 Services (high-touch rewrites)

These files (and any others importing `*Model`) currently assume Mongoose APIs (`find`, `aggregate`, `bulkWrite`, `updateMany`, `$set`, etc.):

- **Player:** `player-core.service.ts`, `player-scores.service.ts`, `player-beatleader-scores.service.ts`, `player-history.service.ts`, `player-search.service.ts`, `player-medals.service.ts`, `player-accuracies.service.ts`, `player-score-history.service.ts`, `player-hmd.service.ts`, `player-friend-scores.service.ts`, `player-ranked.service.ts`, and related.
- **Scores:** `score-core.service.ts`, `medal-scores.service.ts`, `top-scores.service.ts`.
- **Leaderboards:** `leaderboard-core.service.ts`, `leaderboard-ranking.service.ts`, `leaderboard-hmd.service.ts`.
- **Other:** `scoresaber.service.ts`, `beatleader.service.ts`, `beatsaver.service.ts`, `playlist.service.ts`, `app.service.ts`.
- **Discord:** `src/common/discord/user.ts`.
- **Queues:** `src/queue/impl/*.ts` that query `PlayerModel` / leaderboards.
- **Websocket:** `beatsaver-websocket.ts` (Mongo updates).
- **Bot:** `src/bot/command/fetch-missing-player-scores.ts`.
- **Metrics:** `src/metrics/impl/player/daily-new-accounts.ts`, `tracked-players.ts`.

**Pattern to aim for:** thin HTTP/WS handlers → **service layer** → **repository** (SQL queries only). Keeps migration testable.

### 4.3 Mongo-specific query features to reimplement

| Mongo pattern                                                                            | SQL-oriented approach                                                         |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **`aggregate([...])`** (e.g. `player-scores.service.ts`, `player-accuracies.service.ts`) | `JOIN` + window functions, or precomputed materialized views / summary tables |
| **Text index** (`name: "text"` on players)                                               | PostgreSQL `tsvector` + GIN, or external search (Meilisearch, etc.)           |
| **`bulkWrite` / `updateMany`**                                                           | `INSERT ... ON CONFLICT`, batched `UPDATE`, or `COPY` for migrations          |
| **`$set` partial updates**                                                               | `UPDATE ... SET` with nullable column handling                                |
| **`countDocuments` with filters**                                                        | `SELECT COUNT(*)` with equivalent `WHERE`                                     |
| **`lean()` documents**                                                                   | Plain row objects from driver/ORM                                             |

### 4.4 Scripts (`projects/backend/src/scripts/`)

All scripts today use `mongoose.connect` and often raw `mongoose.connection.db.collection(...)`:

- `backfill-beatleader-score-ids.ts`
- `poll-slow-queries.ts` (MongoDB `currentOp` — **replace** with SQL slow-query monitoring, e.g. `pg_stat_statements`)
- `migrate-modifiers-to-codes.ts`
- `delete-duplicate-scoreids.ts`

Rewrite against SQL or run one-off SQL migrations.

### 4.5 Metrics

- **`src/metrics/impl/database/mongo-db-size.ts`**: replace with PostgreSQL size metrics (`pg_database_size`, `pg_indexes_size`, etc.) or remove if not applicable.
- **`src/service/metrics.service.ts`**: rename/register metric types if Mongo-specific names are exposed to Prometheus (`dashboard.yml` may reference Mongo storage — update Grafana/dashboards).

### 4.6 Dependencies

- **`projects/backend/package.json`**: remove `mongoose`, `@typegoose/typegoose`, `@typegoose/auto-increment`; add SQL client + optional ORM migration tool.

---

## 5. Website (`projects/website`)

- If the site only talks to the **HTTP API**, changes may be **minimal** (response shapes must stay compatible unless you version the API).
- Search for any **direct** Mongo assumptions in shared types — usually none if everything goes through `@ssr/common` DTOs.
- Re-run **`bun run lint`** and **`bun run build`** after `common` API changes.

---

## 6. Infrastructure and ops

- **Connection string / secrets:** new env vars for SQL; rotate and document in deployment (Docker, K8s, etc.).
- **Backups:** Mongo dump → `pg_dump` / managed backup strategy.
- **Observability:** update **`dashboard.yml`** (and any alerts) that reference MongoDB storage or Mongo-specific metrics.
- **CI:** add migration job (e.g. `drizzle-kit migrate` / Prisma migrate) and integration tests against a throwaway SQL instance.

---

## 7. Data migration

1. **Freeze or dual-write** during cutover (optional but safer for production).
2. **Export** Mongo collections → **staging** format (CSV/JSON).
3. **Transform** to relational rows (handle `_id`, nested objects, arrays).
4. **Load** with constraints disabled or deferred, then validate **counts**, **checksums**, and **spot-check** critical queries (player page, leaderboards, score charts).
5. **Replay** delta if you had a maintenance window.
6. **Auto-increment** table: ensure score IDs align with application expectations (APIs may expose numeric IDs to clients).

---

## 8. Testing checklist

- Unit tests for repositories (if added).
- Integration tests for hottest paths: player fetch, score listing, leaderboard updates, search.
- Performance: compare explain plans to previous Mongo `aggregate` workloads; add indexes matching query patterns.

---

## 9. Suggested order of work

1. Pick **SQL engine** (PostgreSQL is the usual default) and **ORM/query layer** (Drizzle, Prisma, Kysely, etc.).
2. Design **tables, keys, indexes**, and how to replace **aggregations** and **full-text search**.
3. Introduce **repositories** in the backend and migrate **one vertical slice** (e.g. `players` read path only).
4. Migrate **writes**, then **dependent collections** (scores, leaderboards).
5. Run **data migration** in staging; fix **scripts** and **metrics**.
6. Cut over production; **remove** Mongoose from `common` and `backend`.

---

## 10. Explicit non-goals (unless you expand scope)

- **Redis** migration or removal (queues, cache, `unique-daily-players`, etc.).
- **MinIO/S3** object storage (unchanged).
- Rewriting the **frontend** unless API contracts change.

---

_Generated from repository layout and MongoDB/Typegoose usage as of the plan date; file paths and class names may drift — grep for `mongoose`, `typegoose`, and `Model` imports when executing this plan._
