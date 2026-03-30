# SQL migration plan (MongoDB → PostgreSQL)

This document tracks moving **persistent application data** from **MongoDB** (Mongoose + Typegoose) to **PostgreSQL** with **Drizzle ORM** in `projects/backend`. **Redis** stays as cache/queues unless you explicitly expand scope.

**Runtime today:** The backend still **connects to MongoDB on startup** (`mongoose.connect` in `projects/backend/src/index.ts`). PostgreSQL is used alongside Mongo for migrated paths; **`DATABASE_URL`** is required in `projects/common/src/env.ts` together with **`MONGO_CONNECTION_STRING`** until cutover.

---

## Progress summary (what’s done vs left)

### Done on PostgreSQL (Drizzle)

| Drizzle table (`projects/backend/src/db/schema.ts`) | Replaces (Mongo collection)          | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scoresaber-scores`                                 | `scoresaber-scores`                  | Read/write in `score-core`, `player-scores` (main paths), `top-scores`, playlists, friend scores                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `scoresaber-score-history`                          | `scoresaber-previous-scores`         | Track flow, history queries, **ranking reweight** (`leaderboard-ranking.service.ts`)                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `scoresaber-medal-scores`                           | `scoresaber-medals-scores`           | `medal-scores.service.ts` per-map medal rows; **`scoresaber-accounts.medals`** holds the aggregate                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `scoresaber-leaderboards`                           | `scoresaber-leaderboards`            | `leaderboard-core.service.ts`, search, ranked/qualified lists, **ranking bulk upsert**                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `scoresaber-leaderboard-star-change`                | `scoresaber-leaderboard-star-change` | Star history API via `LeaderboardRankingService.fetchStarChangeHistory`; table in **`0000_initial`**                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `beatleader-scores`                                 | `additional-score-data`              | **Service on PG** (`beatleader.service.ts` track, get, batch, `scoreExists`, `scoresExist`). **`app.service`** `getAppStatistics` counts stored replays from PG (`savedReplay` on `beatleader-scores`).                                                                                                                                                                                                                                                                                                                                       |
| `scoresaber-accounts`                               | `players`                            | Core tracked player / ScoreSaber profile row: **`player-core.service`**, **`player-search`**, **`player-hmd`**, **`player-medals`** (counts, ranks, leaderboard pagination), **`scoresaber.service`** (PP neighbor query), **`beatleader.service`** (account lookup), **seed queues** (`fetch-missing-scores`, BL seed), **`app.service`** (inactive count), **metrics** (`tracked-players`, `daily-new-accounts`). **`PlayerModel`** remains only for **`mongo-to-postgres-scoresaber-accounts.ts`** ETL — not imported by runtime services. |
| `scoresaber-player-history` (`playerHistoryTable`)  | `player-history` (Mongo collection)  | **Runtime on PG** — `player-history.service.ts` uses Drizzle only. Table was created as `player-history` in **`0000_initial`** and renamed to **`scoresaber-player-history`** in **`0001_rename-history-table`**. **ETL:** `projects/migration/scripts/mongo-to-postgres-player-history.ts` upserts from Mongo into PG (unique on `playerId` + `date`).                                                                                                                                                                                       |

**Services largely or fully using PG for the above data**

- `score-core.service.ts` — track score, move prior row to history, `scoreExists` (insert matches `schema.ts`)
- `player-score-history.service.ts` — previous score + history queries
- `player-scores.service.ts` — listing / filters / joins on PG
- `player-ranked.service.ts` — ranked pp queries on `scoresaber-scores` (PG)
- `top-scores.service.ts`
- `medal-scores.service.ts` — medal rows on PG; notification `getChanges` reads prior medal totals from **`scoresaber-accounts`** (not `PlayerModel`)
- **`player-core.service.ts`** — create/update/exists/name/token paths on **`scoresaber-accounts`** (PG runtime path)
- **`player-history.service.ts`** — reads/writes **`playerHistoryTable`** (**`scoresaber-player-history`**); no `PlayerHistoryEntryModel` in backend `src`
- **`player-medals.service.ts`** — aggregates from **`scoresaber-medal-scores`**, writes **`scoresaber-accounts.medals`**, rankings/ranks via SQL on accounts
- **`player-search.service.ts`**, **`player-hmd.service.ts`** — account queries on PG
- `leaderboard-core.service.ts` — CRUD/search/lists, `saveLeaderboard`, **`upsertLeaderboardsFromRankingApi`** (batch sync, preserves `seededScores` / `cachedSongArt`)
- **`leaderboard-ranking.service.ts`** — ranked/qualified refresh: PG upserts for leaderboards + top scores, history PP reweight, star-change inserts, playlist updates; invalidates ranked/qualified list cache keys
- `playlist.service.ts` — ranked/qualified/queue/self/snipe playlist generation on PG data
- `player-friend-scores.service.ts` — friend scores for a leaderboard
- **`beatleader.service.ts`** — BeatLeader scores fully on **`beatleader-scores`** (Drizzle), including **`scoreExists`** / **`scoresExist`**; no `BeatLeaderScoreModel` import here

**Infra**

- `projects/backend/src/db/index.ts` — Drizzle + `pg`
- `projects/backend/drizzle/` — SQL migrations per **`drizzle/meta/_journal.json`**: **`0000_initial`** (baseline tables including scores, history, leaderboards, star-change, accounts, **`player-history`**, BeatLeader, medal scores, etc.) and **`0001_rename-history-table`** (renames **`player-history`** → **`scoresaber-player-history`** and rebuilds indexes)
- Leaderboard **full-text search** on PG (`tsvector` / GIN) in `leaderboard-core.service.ts`

### Still on MongoDB (runtime)

| Area                     | Examples                                                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Metrics / DB telemetry** | `mongo-db-size` reads `dbStats` via `mongoose.connection.db`; Mongo metrics class still registered in `metrics.service.ts`                       |
| **Connection lifecycle** | Backend startup/shutdown still opens/closes Mongo (`mongoose.connect` / `mongoose.disconnect` in `index.ts`)                                    |

### Follow-ups inside migrated code

- **Metrics** (`mongo-db-size`): move gauge to PG equivalent (or retire if no longer needed) and remove Mongo-specific telemetry registration.
- **Single import path for `ScoreSaberScore`**: prefer `@ssr/common/schemas/scoresaber/score/score` where possible; Mongoose `ScoreSaberScore` type still appears in legacy paths.
- **BeatSaver response compatibility**: align `BeatSaverService.getMap` return type/contracts with callers expecting `BeatSaverMapResponse` vs new schema-based `BeatSaverMap` flow.

---

## 1. Original stack (reference)

| Layer             | Technology                                                            | Role                                       |
| ----------------- | --------------------------------------------------------------------- | ------------------------------------------ |
| Primary datastore | MongoDB                                                               | Still required for unmigrated collections  |
| SQL               | PostgreSQL + Drizzle                                                  | Partial system of record                   |
| ODM               | Mongoose 9 + Typegoose                                                | Until removed                              |
| IDs               | String `_id` players; numeric score IDs (historically auto-increment) | PG uses `integer` / `serial` where defined |

---

## 2. Collection → table mapping (updated)

| Legacy collection / concept          | PG table / status                    | Notes                                                                                                                                               |
| ------------------------------------ | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scoresaber-scores`                  | `scoresaber-scores`                  | Migrated for runtime paths (Drizzle)                                                                                                                 |
| `scoresaber-previous-scores`         | `scoresaber-score-history`           | Migrated for runtime paths (Drizzle)                                                                                                                 |
| `scoresaber-medals-scores`           | `scoresaber-medal-scores`            | Migrated; **`scoresaber-accounts.medals`** is the denormalized total (maintained by `player-medals.service` / medal flows)                          |
| `scoresaber-leaderboards`            | `scoresaber-leaderboards`            | Migrated; **`leaderboard-score-seed-queue`** sets `seededScores` on PG                                                                              |
| `scoresaber-leaderboard-star-change` | `scoresaber-leaderboard-star-change` | **Migrated** — ranking sync writes rows; table created in **`0000_initial`**                                                                        |
| `players`                            | **`scoresaber-accounts` (PG)**       | Runtime services use Drizzle; **`PlayerModel`** only for **`mongo-to-postgres-scoresaber-accounts.ts`**                                             |
| `player-history`                     | **`scoresaber-player-history` (PG)** | **`player-history.service`** on Drizzle; physical table name after **`0001_rename-history-table`**. ETL: **`mongo-to-postgres-player-history.ts`**. |
| `additional-score-data` (BeatLeader) | **`beatleader-scores` (PG)**         | Mongo collection name in Typegoose for ETL / scripts; **`beatleader.service`** and **`app.service`** replay counts use PG only                      |
| `beatleader-score-stats`             | **Not in Drizzle yet**               | Score stats JSON in **MinIO** (`StorageBucket.BeatLeaderScoreStats`); Mongo model `beatleader-score-stats` may still exist in `common`              |
| `beatsaver-maps`                     | **`beatsaver-maps` (PG)**            | Runtime save/read uses Drizzle via `beatsaver.service.ts`; uploader/version/difficulty split tables are in `schema.ts`                           |
| `beatsaver-uploaders`                | **`beatsaver-uploaders` (PG)**       | Upserted from token uploader data in `BeatSaverService.saveMap`                                                                                   |
| `beatsaver-map-versions`             | **`beatsaver-map-versions` (PG)**    | Upserted by version hash; fetch path currently loads latest map version for conversion                                                            |
| `beatsaver-map-difficulties`         | **`beatsaver-map-difficulties` (PG)**| Upserted per `(versionId, characteristic, difficulty)` and used for map conversion                                                                |
| `playlists`                          | Generated from PG data               | Runtime playlist generation reads PG scores/leaderboards                                                                                            |
| `metrics`                            | `metrics`                            | Persisted metric snapshots are now stored in PostgreSQL and loaded/saved via `metrics.service.ts`                                                 |
| `discord-users`                      | **Not in Drizzle yet**               |                                                                                                                                                     |
| `increments`                         | N/A for new score IDs                | Use API `scoreId` / app rules                                                                                                                       |

---

## 3. `projects/common`

- **Zod schemas** under `schemas/scoresaber/` largely replace old leaderboard/score **types** for API/domain; Mongoose models still exist for unmigrated data.
- **BeatLeader** persisted score shape and API tokens live under `schemas/beatleader/` (e.g. `score/score.ts`, `tokens/…`); backend maps PG rows via `db/converter/beatleader-score.ts`.
- **Remove** `mongoose` / Typegoose from `common` only after **no** model classes are imported by website/backend for persistence.
- Prefer **one** stable export path per type (avoid duplicate `dist` modules for the same logical type).

---

## 4. `projects/backend` — remaining work

### 4.1 Connection and lifecycle

- [ ] Optional: initialize **SQL pool health** on boot; ensure graceful shutdown for `pg` if not already tied to process exit.
- [ ] **Cutover:** make Mongo connection optional or remove after last consumer is migrated.

### 4.2 Services — still high-touch (remaining migration cleanup)

- **Player accounts (PG):** `player-core`, `player-search`, `player-hmd`, `player-medals`, seed queues on Drizzle tables.
- **Player:** `player-scores` (PG), `player-beatleader-scores`, **`player-history` (PG / Drizzle)**.
- **Leaderboards:** **`leaderboard-score-seed-queue`** (Drizzle `seededScores` + queue); `leaderboard-notifications` only consumes `LeaderboardUpdate` types (no Mongo).
- **BeatLeader / BeatSaver:** `beatleader.service` (PG only for persistence); **BeatSaver runtime is PG-backed** (`beatsaver.service` + `db/converter/beatsaver-map.ts`, websocket ingest writes through `saveMap`).
- **Metrics:** **`metrics/*`** persistence is PG (`metrics` table), but **`mongo-db-size`** still depends on active Mongo connection.

### 4.3 Mongo patterns to replace (where still used)

Same mapping as before: `aggregate` → `JOIN`/windows; `bulkWrite` → batched SQL; text search on players → PG `tsvector` or external search.

### 4.4 Scripts

- **ETL (Mongo → PG):** `projects/migration/scripts/mongo-to-postgres-scoresaber-scores.ts`, `projects/migration/scripts/mongo-to-postgres-scoresaber-accounts.ts`, **`mongo-to-postgres-bl-scores.ts`**, **`mongo-to-postgres-player-history.ts`**, **`mongo-to-postgres-metrics.ts`** — run with `DATABASE_URL` + `MONGO_CONNECTION_STRING`.
- Still Mongo-centric (rewrite or archive when PG is sole source): `backfill-beatleader-score-ids.ts`, `poll-slow-queries.ts`, `migrate-modifiers-to-codes.ts`, `delete-duplicate-scoreids.ts`. PG-oriented scripts (e.g. `create-missing-leaderboards.ts`) should stay aligned with `schema.ts`.

---

## 5. Website (`projects/website`)

- Unchanged assumption: site talks to **HTTP API**; verify responses after each migration slice.

---

## 6. Infrastructure and ops

- Document **`DATABASE_URL`** next to **`MONGO_CONNECTION_STRING`** until dual-store ends.
- **Backups:** `pg_dump` for SQL; Mongo until retired.
- **dashboard.yml / Grafana:** add PG sizing; retire Mongo-only panels when cut over.

---

## 7. Data migration

1. Backfill PG tables from Mongo for scores (via `mongo-to-postgres-scoresaber-scores.ts`), history, leaderboards, medals (one-time or incremental ETL).
2. **`scoresaber-accounts`:** use **`mongo-to-postgres-scoresaber-accounts.ts`** (streams `PlayerModel` → upsert accounts). Run after `DATABASE_URL` and schema are live.
3. **`beatleader-scores`:** backfill from Mongo `additional-score-data` if PG was introduced after production data existed (column set matches **`beatleader-scores`** in **`0000_initial`** / `schema.ts`).
4. **Player medals:** run **`updatePlayerGlobalMedalCounts`** (or equivalent) after medal-score rows are authoritative on PG so **`scoresaber-accounts.medals`** matches `SUM` from **`scoresaber-medal-scores`**.
5. **`scoresaber-player-history`:** use **`mongo-to-postgres-player-history.ts`** to upsert Mongo `player-history` → PG (after **`0000_initial`** / **`0001_rename-history-table`**). Options: `--limit=`, `--batch-size=`, `--player-id=`.
6. **Star change history:** backfill `scoresaber-leaderboard-star-change` from Mongo only if you need rows that predate PG ranking sync (table lives in **`0000_initial`**).
7. Validate counts and hot paths (player page, leaderboards, playlists, BeatLeader views).

---

## 8. Testing checklist

- Integration tests for Drizzle paths: score track, history, friend scores, playlists, medal rescan, **player accounts** (`scoresaber-accounts` CRUD/search), **player statistic history** (`scoresaber-player-history` / `player-history.service`), **medal rankings** pagination, **ranked/qualified refresh** (leaderboard upsert + score upsert + history reweight), **BeatLeader** track/read (`beatleader-scores`).
- Load: indexes on `(playerId)`, `(leaderboardId)`, `(leaderboardId, score DESC)`, etc., matching query patterns.

---

## 9. Suggested order of work (remaining)

1. ~~**`player-medals.service.ts`** / medal aggregates~~ — **Done on PG** (`scoresaber-medal-scores` + **`scoresaber-accounts.medals`**); `ScoreSaberMedalsScoreModel` not referenced in backend `src`.
2. ~~**`scoresaber-accounts` + `player-core` (runtime)**~~ — **Done for main CRUD/search/HMD/medals/queues**.
3. ~~**`player-history.service.ts`** + **`scoresaber-player-history`**~~ — **Done on PG** (Drizzle); ETL via **`mongo-to-postgres-player-history.ts`** for Mongo backfill.
4. ~~**`leaderboard-ranking.service.ts`**~~ — **Done on PG** (leaderboards, scores, history reweight, star-change). ~~**`app.service` `getAppStatistics`**~~ — **dashboard counts on PG**; follow-up: retire Mongo-only DB telemetry (`mongo-db-size`) and optional connection lifecycle.
5. ~~**`leaderboard-score-seed-queue.ts`**~~ — **Done on PG** (`scoreSaberLeaderboardsTable`).
6. ~~**`beatleader.service.ts` existence checks**~~ — **`scoreExists` / `scoresExist`** use Drizzle on `beatLeaderScoresTable`. ~~**`app.service`** stored-replay count~~ — **PG** (`savedReplay`).
7. **BeatSaver cleanup** — finalize response type compatibility (`BeatSaverMapResponse` vs schema-based `BeatSaverMap`) and any caller adjustments.
8. **Metrics + Mongo lifecycle** — smaller surfaces.
9. Remove **`mongoose.connect`**, delete Mongo-only scripts/metrics, strip deps.

---

## 10. Explicit non-goals

- **Redis** migration/removal.
- **MinIO/S3** unchanged.
- Frontend rewrite only if API contracts change.

---

_Refresh this doc when a collection moves: grep `projects/backend/src` for `Model\.` / `mongoose` and align the tables above._
