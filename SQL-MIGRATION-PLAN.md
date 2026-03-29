# SQL migration plan (MongoDB → PostgreSQL)

This document tracks moving **persistent application data** from **MongoDB** (Mongoose + Typegoose) to **PostgreSQL** with **Drizzle ORM** in `projects/backend`. **Redis** stays as cache/queues unless you explicitly expand scope.

**Runtime today:** The backend still **connects to MongoDB on startup** (`mongoose.connect` in `projects/backend/src/index.ts`). PostgreSQL is used alongside Mongo for migrated paths; **`DATABASE_URL`** is required in `projects/common/src/env.ts` together with **`MONGO_CONNECTION_STRING`** until cutover.

---

## Progress summary (what’s done vs left)

### Done on PostgreSQL (Drizzle)

| Drizzle table (`projects/backend/src/db/schema.ts`) | Replaces (Mongo collection)          | Notes                                                                                                                                                                                                     |
| --------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scoresaber-scores`                                 | `scoresaber-scores`                  | Read/write in `score-core`, `player-scores` (main paths), `top-scores`, playlists, friend scores                                                                                                          |
| `scoresaber-score-history`                          | `scoresaber-previous-scores`         | Track flow, history queries, **ranking reweight** (`leaderboard-ranking.service.ts`)                                                                                                                      |
| `scoresaber-medal-scores`                           | `scoresaber-medals-scores`           | `medal-scores.service.ts` medal rows (see caveat below)                                                                                                                                                   |
| `scoresaber-leaderboards`                           | `scoresaber-leaderboards`            | `leaderboard-core.service.ts`, search, ranked/qualified lists, **ranking bulk upsert**                                                                                                                    |
| `scoresaber-leaderboard-star-change`                | `scoresaber-leaderboard-star-change` | Star history API via `LeaderboardRankingService.fetchStarChangeHistory`; migration `0007_*`                                                                                                               |
| `beatleader-scores`                                 | `additional-score-data`              | **Service on PG** (`beatleader.service.ts` track, get, batch, `scoreExists`, `scoresExist`); **`app.service`** still uses Mongo `BeatLeaderScoreModel.countDocuments` for stored-replay stats — see below |

**Services largely or fully using PG for the above data**

- `score-core.service.ts` — track score, move prior row to history, `scoreExists` (insert matches `schema.ts`)
- `player-score-history.service.ts` — previous score + history queries
- `player-scores.service.ts` — listing / filters / joins; **still uses Mongo** for some seed/cleanup aggregates (see below)
- `top-scores.service.ts`
- `medal-scores.service.ts` — medal rows on PG; **still reads `PlayerModel`** for notification `getChanges`
- `leaderboard-core.service.ts` — CRUD/search/lists, `saveLeaderboard`, **`upsertLeaderboardsFromRankingApi`** (batch sync, preserves `seededScores` / `cachedSongArt`)
- **`leaderboard-ranking.service.ts`** — ranked/qualified refresh: PG upserts for leaderboards + top scores, history PP reweight, star-change inserts, playlist updates; invalidates ranked/qualified list cache keys
- `playlist.service.ts` — self + snipe use PG for scores/leaderboards; **stored playlist documents** still `PlaylistModel`
- `player-friend-scores.service.ts` — friend scores for a leaderboard
- **`beatleader.service.ts`** — BeatLeader scores fully on **`beatleader-scores`** (Drizzle), including **`scoreExists`** / **`scoresExist`**; no `BeatLeaderScoreModel` import here

**Infra**

- `projects/backend/src/db/index.ts` — Drizzle + `pg`
- `projects/backend/drizzle/` — SQL migrations through **`0013_*`** (e.g. `0007_*` star history, `0009_*` index tuning, **`0012_*` creates `beatleader-scores`**, **`0013_*` adds song lookup columns** on that table)
- Leaderboard **full-text search** on PG (`tsvector` / GIN) in `leaderboard-core.service.ts`

### Still on MongoDB (not optional until migrated)

| Area                           | Examples                                                                                                                                                                                                       |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Players**                    | `player-core.service.ts`, search, history, medals, HMD, ranked helpers, queues, metrics                                                                                                                        |
| **Player history entries**     | `player-history.service.ts` → `PlayerHistoryEntryModel`                                                                                                                                                        |
| **Medal totals / rankings**    | `player-medals.service.ts` still **aggregates `ScoreSaberMedalsScoreModel` (Mongo)** — out of sync if you only trust PG medal rows                                                                             |
| **Medal notifications**        | `medal-scores.service.ts` still reads **`PlayerModel`** for `getChanges`                                                                                                                                       |
| **ScoreSaber scores (legacy)** | `player-scores.service.ts` (aggregate + `deleteMany`), `player-beatleader-scores`, `player-hmd`, `player-ranked`, `leaderboard-hmd`, `scoresaber.service` (`deleteMany`), **metrics** / **bot** counts         |
| **Leaderboard (legacy)**       | **`app.service.ts`** still uses Mongo `estimatedDocumentCount` for leaderboards/scores/history; **seed queue** is on PG (`leaderboard-score-seed-queue.ts` updates `scoreSaberLeaderboardsTable.seededScores`) |
| **BeatLeader scores**          | **Runtime + existence checks on PG** (`beatleader-scores`); **`BeatLeaderScoreModel`** only in **`app.service`** (stored-replay `countDocuments`) and any scripts/backfill — not in `beatleader.service.ts`    |
| **BeatSaver maps**             | `beatsaver.service.ts`, `beatsaver-websocket.ts` → `BeatSaverMapModel`                                                                                                                                         |
| **Playlists (stored)**         | `playlist.service.ts` — `PlaylistModel` for static playlists (ranked/qualified/queue metadata + song lists)                                                                                                    |
| **App stats / metrics**        | `app.service.ts`, `mongo-db-size` metric, player/score counters — **many still reflect Mongo only**; PG row counts not wired there yet                                                                         |
| **Discord users**              | `common/discord/user.ts`                                                                                                                                                                                       |
| **Metric snapshots**           | `MetricValueModel`                                                                                                                                                                                             |
| **Misc**                       | Seed queues (`PlayerModel`), bot commands, scripts                                                                                                                                                             |

### Follow-ups inside migrated code

- **`player-scores.service.ts`**: finish removing `ScoreSaberScoreModel` (aggregates, `deleteMany`) in favor of PG + player flags strategy.
- **`app.service.ts` / metrics** (`total-tracked-scores`, bot status, BeatLeader replay count): add PG counts or label Mongo vs PG so dashboards are not misleading (BeatLeader row counts can use `beatleader-scores` / `savedReplay` instead of `BeatLeaderScoreModel`).
- **Single import path for `ScoreSaberScore`**: prefer `@ssr/common/schemas/scoresaber/score/score` where possible; Mongoose `ScoreSaberScore` type still appears in legacy paths.

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

| Legacy collection / concept          | PG table / status                    | Notes                                                                                                                                                                                            |
| ------------------------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `scoresaber-scores`                  | `scoresaber-scores`                  | Migrated for main flows; **Mongo model still used** in several services                                                                                                                          |
| `scoresaber-previous-scores`         | `scoresaber-score-history`           | Migrated; Mongo previous-score model only for **legacy metrics/app stats**                                                                                                                       |
| `scoresaber-medals-scores`           | `scoresaber-medal-scores`            | Migrated; **player medal aggregates** still Mongo                                                                                                                                                |
| `scoresaber-leaderboards`            | `scoresaber-leaderboards`            | Migrated; **`leaderboard-score-seed-queue`** sets `seededScores` on PG                                                                                                                           |
| `scoresaber-leaderboard-star-change` | `scoresaber-leaderboard-star-change` | **Migrated** — ranking sync writes rows; run migration `0007_*`                                                                                                                                  |
| `players`                            | **Not in Drizzle yet**               |                                                                                                                                                                                                  |
| `player-history`                     | **Not in Drizzle yet**               |                                                                                                                                                                                                  |
| `additional-score-data` (BeatLeader) | **`beatleader-scores` (PG)**         | Mongo **collection name** in Typegoose for legacy/scripts; **`beatleader.service`** uses PG only; **`app.service`** may still use **`BeatLeaderScoreModel`** for replay stats until wired to SQL |
| `beatleader-score-stats`             | **Not in Drizzle yet**               | Score stats JSON in **MinIO** (`StorageBucket.BeatLeaderScoreStats`); Mongo model `beatleader-score-stats` may still exist in `common`                                                           |
| `beatsaver-maps`                     | **Not in Drizzle yet**               |                                                                                                                                                                                                  |
| `playlists`                          | **Not in Drizzle yet**               | Self/snipe use PG for scores; stored playlists use Mongo                                                                                                                                         |
| `metrics`                            | **Not in Drizzle yet**               |                                                                                                                                                                                                  |
| `discord-users`                      | **Not in Drizzle yet**               |                                                                                                                                                                                                  |
| `increments`                         | N/A for new score IDs                | Use API `scoreId` / app rules                                                                                                                                                                    |

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

### 4.2 Services — still high-touch (Mongo `*Model` / aggregates)

- **Player:** `player-core`, `player-scores` (**remaining** aggregates/seed/deleteMany), `player-beatleader-scores`, `player-history`, `player-search`, **`player-medals`**, `player-accuracies`, `player-hmd`, `player-ranked`, queues.
- **Leaderboards:** **`leaderboard-score-seed-queue`** (Drizzle `seededScores` + queue); `leaderboard-hmd` (score aggregates on Mongo); `leaderboard-notifications` only consumes `LeaderboardUpdate` types (no Mongo).
- **Scores:** `scoresaber.service` cleanup paths; finish aligning **metrics/bot** counts with PG.
- **BeatLeader / BeatSaver:** `beatleader.service` (PG only for persistence); **`app.service`** BeatLeader stats still Mongo until updated; `beatsaver.service`, websocket listener.
- **Playlists:** migrate **`PlaylistModel`** or replace with PG/file/Redis if desired.
- **Discord / metrics / app:** `discord/user`, `app.service`, `metrics/*`, `mongo-db-size` → PG metrics or dual reporting.

### 4.3 Mongo patterns to replace (where still used)

Same mapping as before: `aggregate` → `JOIN`/windows; `bulkWrite` → batched SQL; text search on players → PG `tsvector` or external search.

### 4.4 Scripts

Still Mongo-centric: `backfill-beatleader-score-ids.ts`, `poll-slow-queries.ts`, `migrate-modifiers-to-codes.ts`, `delete-duplicate-scoreids.ts` — rewrite or archive after PG is source of truth. PG-oriented scripts (e.g. `create-missing-leaderboards.ts`) should stay aligned with `schema.ts`.

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

1. Backfill PG tables from Mongo for scores, history, leaderboards, medals (one-time or incremental ETL).
2. **`beatleader-scores`:** backfill from Mongo `additional-score-data` if PG was introduced after production data existed (align with migration `0012_*` / `0013_*` column set).
3. **Player medals:** after `player-medals` reads from PG medal table, run a full recompute (`updatePlayerGlobalMedalCounts` equivalent).
4. **Star change history:** backfill `scoresaber-leaderboard-star-change` from Mongo if you need historical rows before the PG migration shipped.
5. Validate counts and hot paths (player page, leaderboards, playlists, BeatLeader views).

---

## 8. Testing checklist

- Integration tests for Drizzle paths: score track, history, friend scores, playlists, medal rescan, **ranked/qualified refresh** (leaderboard upsert + score upsert + history reweight), **BeatLeader** track/read (`beatleader-scores`).
- Load: indexes on `(playerId)`, `(leaderboardId)`, `(leaderboardId, score DESC)`, etc., matching query patterns.

---

## 9. Suggested order of work (remaining)

1. **`player-medals.service.ts`** — `SUM(medals) GROUP BY player_id` from `scoresaber-medal-scores`; drop `ScoreSaberMedalsScoreModel` reads.
2. ~~**`leaderboard-ranking.service.ts`**~~ — **Done on PG** (leaderboards, scores, history reweight, star-change). Follow-up: **`app.service` / metrics** still Mongo counts for leaderboards/scores/history.
3. ~~**`leaderboard-score-seed-queue.ts`**~~ — **Done on PG** (`scoreSaberLeaderboardsTable`). Remaining: **`player-scores`**, **`player-core`**, **`app.service`**, metrics/bot — drop `ScoreSaberScoreModel` / aggregates where PG is authoritative.
4. ~~**`beatleader.service.ts` existence checks**~~ — **`scoreExists` / `scoresExist`** use Drizzle on `beatLeaderScoresTable`. Follow-up: **`app.service`** BeatLeader replay `countDocuments` → PG (`savedReplay`) if you want stats off Mongo.
5. **`players` table + `player-core`** — largest dependency hub.
6. **BeatSaver** maps (`BeatSaverMapModel`) — table or keep Mongo until later.
7. **Playlists, metrics, discord** — smaller surfaces.
8. Remove **`mongoose.connect`**, delete Mongo-only scripts/metrics, strip deps.

---

## 10. Explicit non-goals

- **Redis** migration/removal.
- **MinIO/S3** unchanged.
- Frontend rewrite only if API contracts change.

---

_Refresh this doc when a collection moves: grep `projects/backend/src` for `Model\.` / `mongoose` and align the tables above._
