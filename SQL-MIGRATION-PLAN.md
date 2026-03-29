# SQL migration plan (MongoDB → PostgreSQL)

This document tracks moving **persistent application data** from **MongoDB** (Mongoose + Typegoose) to **PostgreSQL** with **Drizzle ORM** in `projects/backend`. **Redis** stays as cache/queues unless you explicitly expand scope.

**Runtime today:** The backend still **connects to MongoDB on startup** (`mongoose.connect` in `projects/backend/src/index.ts`). PostgreSQL is used alongside Mongo for migrated paths; **`DATABASE_URL`** is required in `projects/common/src/env.ts` together with **`MONGO_CONNECTION_STRING`** until cutover.

---

## Progress summary (what’s done vs left)

### Done on PostgreSQL (Drizzle)

| Drizzle table (`projects/backend/src/db/schema.ts`) | Replaces (Mongo collection)  | Notes                                                                |
| --------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------- |
| `scoresaber-scores`                                 | `scoresaber-scores`          | Read/write in `score-core`, `player-scores`, `top-scores`, playlists |
| `scoresaber-score-history`                          | `scoresaber-previous-scores` | Prior score rows; `player-score-history`, `score-core` track flow    |
| `scoresaber-medal-scores`                           | `scoresaber-medals-scores`   | `medal-scores.service.ts` fully on PG                                |
| `scoresaber-leaderboards`                           | `scoresaber-leaderboards`    | `leaderboard-core.service.ts` + joins elsewhere                      |

**Services largely or fully using PG for the above data**

- `score-core.service.ts` — track score, history move, `scoreExists`
- `player-score-history.service.ts` — previous score + history queries
- `player-scores.service.ts` — main score listing / filters / joins to leaderboards
- `top-scores.service.ts`
- `medal-scores.service.ts` — medal rows (see caveat below)
- `leaderboard-core.service.ts` — CRUD/search/ranked lists for leaderboards
- `playlist.service.ts` — self + snipe playlists (join scores ↔ leaderboards); custom ranked from PG leaderboards
- `player-friend-scores.service.ts` — friend scores for a leaderboard

**Infra**

- `projects/backend/src/db/index.ts` — Drizzle + `pg`
- `projects/backend/drizzle/` — SQL migrations
- Leaderboard **full-text search** on PG (`tsvector` / GIN) in `leaderboard-core.service.ts`

### Still on MongoDB (not optional until migrated)

| Area                         | Examples                                                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Players**                  | `player-core.service.ts`, search, history, medals, HMD, ranked helpers, queues, metrics                                 |
| **Player history entries**   | `player-history.service.ts` → `PlayerHistoryEntryModel`                                                                 |
| **Medal totals / rankings**  | `player-medals.service.ts` still **aggregates `ScoreSaberMedalsScoreModel` (Mongo)** — out of sync if medals only in PG |
| **Medal notifications**      | `medal-scores.service.ts` still reads **`PlayerModel`** for `getChanges`                                                |
| **Leaderboard ranking sync** | `leaderboard-ranking.service.ts` — bulk score/leaderboard/star-change Mongo writes                                      |
| **Previous scores model**    | Ranking service still uses `ScoreSaberPreviousScoreModel` in places (PG history table is the target replacement)        |
| **BeatLeader scores**        | `beatleader.service.ts` → `BeatLeaderScoreModel`                                                                        |
| **BeatSaver maps**           | `beatsaver.service.ts`, `beatsaver-websocket.ts` → `BeatSaverMapModel`                                                  |
| **Playlists (stored)**       | `playlist.service.ts` — `PlaylistModel` for static playlists (ranked/qualified/queue)                                   |
| **App stats / metrics**      | `app.service.ts`, `mongo-db-size.ts`, player/score counters                                                             |
| **Discord users**            | `common/discord/user.ts`                                                                                                |
| **Metric snapshots**         | `MetricValueModel`                                                                                                      |
| **Misc**                     | `scoresaber.service.ts` (e.g. `ScoreSaberScoreModel.deleteMany`), seed queues, bot commands, scripts                    |

### Follow-ups inside migrated code

- Align **`score-core.service.ts`** insert shape with **`schema.ts`** (e.g. remove or add columns like `beatLeaderScoreId` if you add them to Drizzle).
- **`leaderboard-ranking.service.ts`** / **`player-scores.service.ts`**: grep for remaining `ScoreSaberScoreModel` / `ScoreSaberLeaderboardModel` / aggregates and port to PG.
- **Single import path for `ScoreSaberScore`**: use `@ssr/common/schemas/scoresaber/score/score` consistently to avoid duplicate nominal types from `@ssr/common/schemas/scoresaber/score`.

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

| Legacy collection / concept          | PG table / status          | Notes                                                        |
| ------------------------------------ | -------------------------- | ------------------------------------------------------------ |
| `scoresaber-scores`                  | `scoresaber-scores`        | Migrated                                                     |
| `scoresaber-previous-scores`         | `scoresaber-score-history` | Migrated for track/history; ranking may still touch Mongo    |
| `scoresaber-medals-scores`           | `scoresaber-medal-scores`  | Migrated; **player medal aggregates** still Mongo            |
| `scoresaber-leaderboards`            | `scoresaber-leaderboards`  | Migrated in core; ranking bulk ops may still use Mongo model |
| `scoresaber-leaderboard-star-change` | **Not in Drizzle yet**     | Still Mongo in ranking service                               |
| `players`                            | **Not in Drizzle yet**     |                                                              |
| `player-history`                     | **Not in Drizzle yet**     |                                                              |
| `additional-score-data` / BeatLeader | **Not in Drizzle yet**     |                                                              |
| `beatleader-score-stats`             | **Not in Drizzle yet**     |                                                              |
| `beatsaver-maps`                     | **Not in Drizzle yet**     |                                                              |
| `playlists`                          | **Not in Drizzle yet**     | Self/snipe use PG for scores; stored playlists use Mongo     |
| `metrics`                            | **Not in Drizzle yet**     |                                                              |
| `discord-users`                      | **Not in Drizzle yet**     |                                                              |
| `increments`                         | N/A for new score IDs      | Use API `scoreId` / app rules                                |

---

## 3. `projects/common`

- **Zod schemas** under `schemas/scoresaber/` largely replace old leaderboard/score **types** for API/domain; Mongoose models still exist for unmigrated data.
- **Remove** `mongoose` / Typegoose from `common` only after **no** model classes are imported by website/backend for persistence.
- Prefer **one** stable export path per type (avoid duplicate `dist` modules for the same logical type).

---

## 4. `projects/backend` — remaining work

### 4.1 Connection and lifecycle

- [ ] Optional: initialize **SQL pool health** on boot; ensure graceful shutdown for `pg` if not already tied to process exit.
- [ ] **Cutover:** make Mongo connection optional or remove after last consumer is migrated.

### 4.2 Services — still high-touch (Mongo `*Model` / aggregates)

- **Player:** `player-core`, `player-scores` (remaining aggregates/seed paths), `player-beatleader-scores`, `player-history`, `player-search`, **`player-medals`**, `player-accuracies`, `player-hmd`, `player-ranked`, queues.
- **Leaderboards:** **`leaderboard-ranking`**, `leaderboard-hmd`, `leaderboard-notifications` (verify).
- **Scores:** `scoresaber.service` cleanup paths; finish ranking/previous-score alignment.
- **BeatLeader / BeatSaver:** `beatleader.service`, `beatsaver.service`, websocket listener.
- **Playlists:** migrate **`PlaylistModel`** or replace with PG/file/Redis if desired.
- **Discord / metrics / app:** `discord/user`, `app.service`, `metrics/*`, `mongo-db-size` → PG metrics.

### 4.3 Mongo patterns to replace (where still used)

Same mapping as before: `aggregate` → `JOIN`/windows; `bulkWrite` → batched SQL; text search on players → PG `tsvector` or external search.

### 4.4 Scripts

Still Mongo-centric: `backfill-beatleader-score-ids.ts`, `poll-slow-queries.ts`, `migrate-modifiers-to-codes.ts`, `delete-duplicate-scoreids.ts` — rewrite or archive after PG is source of truth.

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
2. **Player medals:** after `player-medals` reads from PG medal table, run a full recompute (`updatePlayerGlobalMedalCounts` equivalent).
3. Validate counts and hot paths (player page, leaderboards, playlists).

---

## 8. Testing checklist

- Integration tests for Drizzle paths: score track, history, friend scores, playlists, medal rescan.
- Load: indexes on `(playerId)`, `(leaderboardId)`, `(leaderboardId, score DESC)`, etc., matching query patterns.

---

## 9. Suggested order of work (remaining)

1. **`player-medals.service.ts`** — `SUM(medals) GROUP BY player_id` from `scoresaber-medal-scores`; drop `ScoreSaberMedalsScoreModel` reads.
2. **`leaderboard-ranking.service.ts`** — bulk leaderboard + score writes to PG; retire `ScoreSaberLeaderboardModel` / `ScoreSaberScoreModel` / `ScoreSaberPreviousScoreModel` there.
3. **`players` table + `player-core`** — largest dependency hub.
4. **BeatLeader / BeatSaver** tables or keep Mongo until later — your call.
5. **Playlists, metrics, discord** — smaller surfaces.
6. Remove **`mongoose.connect`**, delete Mongo-only scripts/metrics, strip deps.

---

## 10. Explicit non-goals

- **Redis** migration/removal.
- **MinIO/S3** unchanged.
- Frontend rewrite only if API contracts change.

---

_Refresh this doc when a collection moves: grep `projects/backend/src` for `Model\.` / `mongoose` and align the tables above._
