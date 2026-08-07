# SSR Backend Audit — Issues

**Date:** 2026-08-07
**Scope:** `projects/backend/src/**`, `projects/common/src/**` (shared schemas/utils consumed by the backend), `projects/backend/drizzle/**` (migrations)
**Method:** 12 parallel read-only audit slices (schema/migrations, repositories, score ingestion, BeatLeader, external APIs, player services, leaderboards, HTTP/controllers, cache/infra, queue/events/websocket, bot/metrics/common, security) + independent verification. Key claims were verified against the live ScoreSaber / BeatLeader APIs and by reading the code paths end-to-end. Findings cite `file:line`; inferences are tagged `[INFERENCE]`.

---

## Summary

| Severity | Count |
|---|---|
| Critical | 2 |
| High | 17 |
| Medium | 46 |
| Low | 25 |
| Info | 7 |

**The two Criticals share one root cause:** the BeatLeader attribution rework (commit `21800d04`, "Attribute BeatLeader scores using linked accounts") broke both the real-time and the backfill paths of the BeatLeader score pipeline. Together they reproduce the user-reported bug ("players such as `ssr.fascinated.cc/player/3469851723141662` do not have their beatleader scores saved"): **no historical BL score is ever inserted, and for players whose BeatLeader ID equals their ScoreSaber ID (all Steam players) one platform's real-time score per play is silently discarded.**

Other themes: the seed/backfill queues are at-most-once with no retry and mark work permanently complete after partial/transient failure; several hot queries scan the ~80M-row `scoresaber-scores` table without index support; the entire HTTP surface is unauthenticated and unthrottled, and GETs can create DB rows and enqueue full upstream scrapes.

---

## Critical

### C1. BeatLeader historical scores are never seeded — schema requires `scoreImprovement`, API sends `null` (A4-01)
- **Status:** ✅ Fixed 2026-08-07 — the seed now requests `includeIO: true` (`player-beatleader-scores.service.ts:74`) and `scoreImprovement` is nullable in `BeatLeaderScoreSchema` (`tokens/score/score.ts:51`). Verified against the live API with the repo's schema: `includeIO=true` parses (improvement + offsets present) and `includeIO=false` (null) now parses too. Both consumers (`improvementRowFromToken`, `beatLeaderScoreFromToken`) already handled null.
- **Category:** Bug | **Files:** `projects/common/src/schemas/beatleader/tokens/score/score.ts:51`, `projects/backend/src/service/external/beatleader-api.service.ts:197,205`, `projects/backend/src/service/player/player-beatleader-scores.service.ts:141-146`
- **Problem:** The seed/backfill path validates every scores page against `BeatLeaderScoreSchema`, which requires `scoreImprovement` as a non-null object. The API call sends `includeIO: "false"`, and the live BeatLeader API (verified: `GET /player/335393/scores?...&includeIO=false` returns `"scoreImprovement": null` for every score; `includeIO=true` returns the object) then fails `safeParse`. `lookupPlayerScores` returns `undefined`, the seed breaks on page 1 for every player, and `seededBeatLeaderScores` is never set — **no historical BL score is ever inserted**. Because the whole ~37k-account population re-runs the failing seed every 10 minutes, this also sustains constant BL API load (see H4/H6).
- **Evidence:** `score.ts:51` `scoreImprovement: BeatLeaderScoreImprovementSchema` (non-null); `beatleader-api.service.ts:197` `includeIO: o.includeIO ? "true" : "false"` with the seed not passing `includeIO`; live API responses verified both ways.
- **Fix:** Send `includeIO: "true"` from the seed, and/or make `scoreImprovement` (and other potentially-null fields like `accuracy`, `modifiers`) nullable in `BeatLeaderScoreSchema`. `improvementRowFromToken` already tolerates null improvements.

### C2. Cross-platform real-time score pairing is dead (NaN timeset) — one platform's score silently dropped per play (A3-01)
- **Status:** ✅ Fixed 2026-08-07 — ScoreSaber `timeSet` values are now converted with `new Date(timeSet).getTime()` (`scoresaberTimesetToMs`, `platform-score-handlers.ts:52`) at all three SS-timeset comparison sites, and both pending-score stores flush (process) any existing entry under the key before overwriting instead of discarding it. Verified with a simulation of the same play (SS ISO + BL unix-seconds): old math `NaN` → never matched; new math `delta 0` → matched within the 5s window. Backend typecheck + lint pass.
- **Category:** Bug | **Files:** `projects/backend/src/websocket/listeners/platform-score-handlers.ts:133,138-166,203-246`, `projects/common/src/utils/beatleader-utils.ts:14-16`, `projects/common/src/token-creators.ts:167`
- **Problem:** ScoreSaber's `timeSet` is an ISO-8601 string (verified live: `"2021-08-11T17:44:41.000Z"`; the same field is parsed with `new Date(token.timeSet)` at `token-creators.ts:167`). The new pairing code feeds it to `beatLeaderTimesetToMs`, which does `Number(timeset)` → `NaN` for ISO strings. Every `Math.abs(... - NaN) <= 5000` check is false, so neither the direct-key match nor `findPendingBlScore`/`findPendingSsScore` can ever pair. Every play falls through to `PENDING_SCORES.set(key, …)`, which **overwrites whichever platform's event arrived first** under the same key. For players whose SS ID equals their BL ID (all Steam players — both are the 17-digit Steam ID), the first platform's score token is discarded; the 60s sweep then processes only the survivor (SS-only or BL-only). The discarded platform's score never reaches the DB, never creates a score event, never increments plays, and never notifies. Regression introduced by `21800d04` (the pre-rework code paired by key alone).
- **Evidence:** `platform-score-handlers.ts:133` `beatLeaderTimesetToMs(score.score.timeSet)` on an ISO string; `beatleader-utils.ts:14-16` `Number("2024-06-03T07:58:26.000Z")` → NaN; verified `NaN <= 5000` → false; overwrite at lines 160-166 / 242-246.
- **Fix:** Convert ScoreSaber timesets with a date parser (`new Date(score.timeSet).getTime()`, or reuse the already-parsed `score.timestamp`), and before overwriting a pending entry holding the other platform's score, process/merge it instead of discarding it.

---

## High

### H1. Unauthenticated, unthrottled GETs create DB rows and enqueue full upstream scrapes; one shared proxy budget (A12-01, A8-02, A8-11)
- **Category:** Security | **Files:** `player.controller.ts:73-88`, `scoresaber-player.service.ts:52-65`, `player-core.service.ts:160-177`, `scoresaber-leaderboards.service.ts:47-53,148-179`, `scores.controller.ts:48-68`, `scoresaber-api.service.ts:105-110`
- **Problem:** Every state-changing operation is reachable via unauthenticated GET: `GET /player/:id`, `/player/search`, `/ranking/:page` → `createPlayer` (inserts an account row and enqueues a multi-page `FetchMissingScoresQueue` job); `GET /leaderboard/by-id/:id`, `/scores/leaderboard/:id/:page`, `/scores/:scoreId`, `/player/score-history/...` → `createLeaderboard` (upstream fetch + insert + full `LeaderboardScoreSeedQueue` scrape); `/player/refresh/:id` fires an upstream refresh; live-scores GETs fire-and-forget `upsertScoresFromApi` DB upserts. There is no auth middleware, no rate limiting, and no per-IP throttle anywhere (`/metrics` is the only authed endpoint). All upstream traffic flows through one shared `PROXY_URL`; an attacker enumerating sequential leaderboard/player IDs can exhaust the ScoreSaber quota and starve the legitimate ingestion pipeline, while polluting the DB.
- **Evidence:** `scoresaber-leaderboards.service.ts:47-52` `getLeaderboard` → `createLeaderboard` on miss; `:168-173` seed-queue enqueue; `player-core.service.ts:163-177` refresh-queue enqueue on `trackedScores < totalSubmittedPlays`; `scoresaber-api.service.ts:105-110` single shared proxy fetch.
- **Fix:** Auth (Bearer/API key) or per-IP rate limits on state-changing routes; gate account/leaderboard auto-creation and queue enqueues; cap seed queue depth; don't enqueue background jobs from unauthenticated requests.

### H2. Leaderboard marked seeded even when pages were skipped or the scrape aborted — permanently incomplete scores (A10-01, A5-03)
- **Category:** Data Integrity | **Files:** `projects/backend/src/queue/impl/leaderboard-score-seed-queue.ts:37-104`
- **Problem:** The scrape loop skips pages after 2 consecutive upstream failures ("skipping this page and continuing (leaderboard may be incompletely seeded)") or aborts, but `markLeaderboardSeeded(leaderboardId)` at line 104 runs unconditionally afterwards. Once `seededScores = true`, `insertLeaderboards()` (selects only `seededScores = false`) never re-queues the leaderboard — the missing pages are permanently lost. Since `ScoreSaberApiService.fetch` collapses every failure (429/timeout/5xx) to `undefined` with no retry/backoff, this triggers under ordinary API blips.
- **Evidence:** skip/abort branches at lines 41-53; unconditional `markLeaderboardSeeded` at 104; requeue filter at 126-130.
- **Fix:** Track `pagesSkipped`; skip `markLeaderboardSeeded` when any page was skipped or aborted so the next 10-minute cycle retries.

### H3. Player score backfill lost permanently after one transient API failure (A10-02)
- **Category:** Data Integrity | **Files:** `projects/backend/src/queue/impl/player-scoresaber-scores-queue.ts:24-73`, `player-scores.service.ts:184-188,204-206`, `queue/queue.ts:95-138`
- **Problem:** The queue is at-most-once (pops before processing, drops the item on error, no retry/dead-letter). Worse, `fetchMissingPlayerScores` sets `hasMoreScores = false` when any page returns `undefined` (rate limit/5xx/timeout) and then **unconditionally marks the account `seededScores: true`**. The player is never re-fetched — a transient mid-refresh failure becomes permanent missing scores for that player.
- **Evidence:** `player-scores.service.ts:184-188` `if (!scoresPage) { hasMoreScores = false; continue; }`; `:204-206` `updatePlayer(account.id, { seededScores: true })`; `selectIdsNeedingScoreSeed` selects only unseeded.
- **Fix:** Only set `seededScores` when the full fetch completed; treat a failed page as an error (throw → queue retry) or add retry/backoff + dead-letter.

### H4. BL seed marks player seeded with zero scores on a transient outage (A4-02)
- **Category:** Error Handling | **Files:** `player-beatleader-scores.service.ts:141-146,176-177`, `beatleader-api.service.ts:52-62`
- **Problem:** On a page-1 failure, `completed = currentPage === 1 && !(await lookupPlayer(playerId))`. `lookupPlayer` returns `undefined` both for a genuine 404 and for any transport/HTTP/parse failure — so a BL/proxy outage makes real players get `seededBeatLeaderScores = true` with zero scores, permanently (the code comment claims the opposite behavior). Any outage window silently loses the whole BL backfill for every player processed during it.
- **Fix:** Distinguish 404 from other failures (tagged union / `{ notFound }`); only mark completed on a genuine 404.

### H5. Replace-current score path is non-transactional and race-loses scores (A3-02)
- **Category:** Data Integrity | **Files:** `score-core.service.ts:73-90`, `scoresaber-scores.repository.ts:134-141`, `schema.ts:175`
- **Problem:** `trackScoreSaberScore` snapshots the old row → **deletes it** → inserts the new row, in three separate statements with no transaction (crash between delete and insert loses the player's current PB; only the history snapshot survives). `insertScore` uses `onConflictDoNothing({ target: scoreId })`, but the table also has `uniqueIndex("scores_player_leaderboard_unique")` on `(playerId, leaderboardId)`: two concurrent plays (live pipeline + 10-worker seed queue, or two live events) both pass the check-then-act guards, and the loser raises `23505`, which the scoreId-targeted ON CONFLICT does not suppress. The exception is only logged in `processScore` (platform-score-handlers.ts:328-330) — the newer play is silently lost and the player's current row may be left stale or missing.
- **Fix:** Wrap snapshot+delete+insert in a DB transaction and handle the `(playerId, leaderboardId)` conflict (`onConflictDoUpdate` on that target, or catch 23505 and re-fetch/retry).

### H6. BL API calls have no retry, backoff, or 429 handling; mitigations removed by the rework (A4-03)
- **Category:** Performance | **Files:** `beatleader-api.service.ts:27-74`, `player-beatleader-scores.service.ts:67-75`, `player-beatleader-score-seed-queue.ts:16`
- **Problem:** `BeatLeaderApiService.fetch` is a single attempt with a 15s abort; any non-200 (including 429) returns `undefined` with no retry and no `Retry-After` handling. The previous implementation had `MAX_LOOKUP_ATTEMPTS = 5` with exponential backoff (commit `c9b868db`) and inter-page throttling (commit `a3b8aa08`); `21800d04` deleted both. With C1 active, ~37k unseeded accounts each re-issue a failing scores call + a lookup every 10 minutes (~74k requests/cycle) — guaranteed rate-limit churn that feeds H4.
- **Fix:** Re-introduce exponential backoff for 429/5xx/timeout (honor `Retry-After`), cap concurrent BL fetches globally, treat only a definitive 404 as non-retryable.

### H7. BL player mapping cache only populated by a completed seed — real-time attribution disabled (A4-04)
- **Category:** Consistency | **Files:** `player-beatleader-scores.service.ts:176-181`, `beatleader.service.ts:136-152,353-359`, `platform-score-handlers.ts:337-342`
- **Problem:** Real-time BL scores for players whose BL ID differs from their SS account ID are only resolvable via the `beatleader-players` cache, which is written in exactly one place: `upsertBeatLeaderPlayer` inside the seed's `if (completed)` block. Two holes: the account is marked `seededBeatLeaderScores = true` **before** the upsert, and `upsertBeatLeaderPlayer` silently returns `undefined` on lookup failure — leaving no mapping, never re-seeded. With C1 the seed never completes, so the cache is never populated at all and the linked-account attribution the rework was built for is dead.
- **Fix:** Populate the mapping before marking seeded; retry the upsert (or don't set `seededBeatLeaderScores` on failure); opportunistically upsert the mapping when a real-time BL score arrives for an unknown playerId.

### H8. Global `ORDER BY pp DESC` queries seq-scan the 80M-row scores table; the pp index was dropped (A2-01, A1-03)
- **Category:** Performance | **Files:** `scoresaber-scores.repository.ts:207-225`, `schema.ts:174-189`, `drizzle/0037_fresh_blacklash.sql`, `platform-score-handlers.ts:280`
- **Problem:** `selectTopPp` (WHERE pp > 0 ORDER BY pp DESC LIMIT 50) and `getTopScores` have no supporting index — every scores index leads with playerId or leaderboardId. Postgres seq-scans + top-N sorts ~80M rows per call. This runs on **every websocket score event** (`isTop50GlobalScore` → `selectTopPp`) and on every `GET /scores/top/:page` (uncached). The only pp-leading partial index (`scores_pp_desc_player_partial_idx`, added in 0028) was dropped in migration 0037.
- **Fix:** Recreate a partial index `(pp DESC, scoreId DESC) WHERE pp > 0` (declare in `schema.ts`), and/or cache the top-50 result.

### H9. `scoresaber-score-history` has no index on `scoreId` — archived-score lookups seq-scan (A2-02, A12-02, A1-07)
- **Category:** Performance | **Files:** `scoresaber-score-history.repository.ts:42-48`, `schema.ts:223-235`, `player-scores.service.ts:253-255`, `scores.controller.ts:31-47`
- **Problem:** `findRowByScoreId` filters `WHERE scoreId = $1` on the history table, whose indexes are (leaderboardId), (playerId, leaderboardId, timestamp DESC), (leaderboardId, playerId, score) — none leads with scoreId. The public, unauthenticated `GET /scores/:scoreId` falls back to this method for every archived score → full sequential scan of a very large table per request, attacker-driven with no rate limit.
- **Fix:** Add an index on `scoreId` (declare in schema.ts), or resolve history lookups via a join keyed on (leaderboardId, playerId).

### H10. `getOrCreateAccount` without a player token wipes `country` and clears `banned` (A6-01)
- **Category:** Data Integrity | **Files:** `player-core.service.ts:74-81`, `common/score/score.util.ts:166`
- **Problem:** The country/banned sync is not guarded on the token being present: with `playerToken` undefined, `playerToken?.country !== account.country` is true for any non-null country → `updates.country = null`; likewise `banned` resets to false. `sendMedalScoreNotification` calls `getOrCreateAccount(playerId)` with **no token** on every medal change (every new top-10 ranked score). Players drop out of country medal rankings (`accounts_medal_ranking_country_idx` requires country NOT NULL) and banned players can be un-banned, until the nightly job re-syncs.
- **Evidence:** `player-core.service.ts:75-81` `updates.country = playerToken?.country ?? null; updates.banned = playerToken?.banned ?? false;` — the avatar check is correctly guarded with `playerToken &&`, these two are not.
- **Fix:** Guard the sync block on `playerToken` being present.

### H11. Player score backfill never early-exits — full daily re-walk of every player's entire history (A6-02)
- **Category:** Performance | **Files:** `player-scores.service.ts:96-177`, `player-history.service.ts:99-118`, `score-core.service.ts:79-84`
- **Problem:** The early-exit compares the `scoresaber-scores` row count against `totalSubmittedPlays`, but replays with a worse score are archived to `scoresaber-score-history` and never counted in `scoresaber-scores` (unique per player+leaderboard). The count can never equal `totalSubmittedPlays` for any player who ever replayed a map, so the loop always fetches **every page** of the player's full SS history, and since commit `610617ac` removed the batched existing-scoreId pre-filter, each score runs ~2 reads + 1 write. `updatePlayerStatistics` re-queues nearly all ~37k active players nightly → this full re-walk runs daily for the whole player base.
- **Fix:** Count scores + history (or compare against the sum) so the early exit can trigger; restore a batched existing-scoreId pre-filter per page.

### H12. Deranked/removed maps never lose `ranked`/`qualified` status (A7-01)
- **Category:** Data Integrity | **Files:** `leaderboard-ranked-sync.service.ts:40-101`
- **Problem:** `refreshRankedLeaderboards()`/`refreshQualifiedLeaderboards()` only upsert leaderboards present in the current API lists; there is no sweep clearing `ranked=false`/`qualified=false` for maps SS has deranked/removed, and no other code path writes `ranked=false`. Deranked maps keep their stars/rankedDate forever — they keep appearing under `?ranked=true`, star filters, and leaderboard pages, so the ranked catalog drifts from ScoreSaber ground truth and never self-heals.
- **Fix:** After the upsert pass, compute the set difference between previously ranked/qualified DB rows and the API lists and batch-update them to false (null stars/rankedDate as appropriate).

### H13. Playlist endpoints materialize every score of a player per request — unbounded, uncached, unauthenticated (A8-01)
- **Category:** Performance | **Files:** `playlist.service.ts:482-517`, `scoresaber-scores.repository.ts:384-398`
- **Problem:** `/playlist/self` and `/playlist/snipe` run `selectScoresJoinedLeaderboardsWhere` with **no `.limit()`** — tens of thousands of rows for a top player, joined to leaderboards, an `inArray` of ~40k leaderboard ids, an in-memory sort, and a multi-MB playlist response; `/snipe` does this for two players concurrently. Unauthenticated, uncached, unthrottled.
- **Fix:** Cap scores per request (top-N by PP), cache generated playlists keyed by (user, settings), rate-limit.

### H14. `lookupActivePlayerCount` always returns `undefined` — landing "Active Players" stat stuck at 0 (A5-02)
- **Category:** Bug | **Files:** `scoresaber-api.service.ts:241-249` (+ `:128-134`), `metrics/impl/player/active-accounts.ts:13-16`, `app.service.ts:150`
- **Problem:** `/v2/players/count` is deliberately read as text (`isJson` excludes `/players/count` — an old workaround for a mislabeled content-type), so `fetch` returns the raw string; `lookupActivePlayerCount` then reads `response.count` off that string → always `undefined`. (Verified live: the endpoint now returns proper JSON `{"count":37598}` with `application/json`.) `ActiveAccountsMetric` never updates, the `active_accounts` gauge stays 0, and the landing page shows 0 active players — one of the recently changed "live app stats" areas.
- **Fix:** Parse the body (`Number.parseInt` on the text, or parse JSON).

### H15. SS API failures silently collapse to `undefined` — 429s become 404s and truncated syncs (A5-04, A7-06)
- **Category:** Error Handling | **Files:** `scoresaber-api.service.ts:111-138,503-506`, `scoresaber-leaderboard-scores.service.ts:32-34`
- **Problem:** `fetch` maps every failure (429, 15s abort, network, non-200, parse) to `undefined` with no logging of status and no retry. Callers can't distinguish "rate limited" from "not found": a transient SS 429 makes the leaderboard scores endpoint return HTTP 404; `getScoreSaberLivePlayerScores` returns an empty page; and `getAllLeaderboards` treats a failed page as end-of-data, silently truncating the ranked/qualified sync (which then reports "Updated X/Y" as if complete).
- **Fix:** Expose/throw typed errors for 429/5xx/timeout, retry with backoff honoring `Retry-After`, and have callers return 502/429 instead of 404/truncation.

### H16. No timeout on `ApiService`/`Request` fetches — BeatSaver calls and replay downloads can hang forever (A5-05)
- **Category:** Error Handling | **Files:** `common/src/utils/request.ts:92-98`, `beatleader.service.ts:83,298-300`
- **Problem:** `Request.executeRequest` passes no AbortController/signal (unlike `ScoreSaberApiService.fetch`, which has a 15s timeout). BeatSaver lookups on the HTTP hot path and the BeatLeader replay download (awaited inside `trackBeatLeaderScore` on the live websocket path) can stall indefinitely on a hung connection: no timeout, no size cap.
- **Fix:** Add an AbortController with a per-request timeout in `executeRequest`; propagate abort as a normal `undefined` result.

### H17. Storage memory cache retains every saved file with no TTL; replay buffers accumulate in heap (A9-01)
- **Category:** Performance | **Files:** `storage.service.ts:27-31,68-76`, `beatleader.service.ts:303`
- **Problem:** `StorageService.CACHE` is an `SSRCache` with `maxObjects: 5000` and **no TTL**; `saveFile` unconditionally stores the full file Buffer. BL replays are written through `saveFile` but never read from cache (only served from the CDN URL), so every tracked replay becomes a permanently resident heap Buffer until FIFO eviction. Scale note: only ~242 replays exist today (bounded), but it grows unbounded with `trackReplays` adoption; also, FIFO eviction evicts frequently re-set hot keys first, causing S3 refetch thrash.
- **Fix:** Don't cache replay buffers (skip `CACHE.set` for large blobs or add a TTL + byte cap); switch eviction to true LRU.

---

## Medium

### M1. Fire-and-forget promises without `.catch` in the live score path — silent work loss + Discord spam (A3-03, A10-06, A10-07)
- **Files:** `track-score-listener.ts:56-62` (`updatePlayerDailyScoreStats` + 4× `CacheService.invalidate`), `platform-score-handlers.ts:109-116,346-359` (sweep/onStop `processScore`), `:314` (`saveScoreStats`), `leaderboard-score-seed-queue.ts:76` (`createIfMissing`)
- **Problem:** All are fired without await/catch. The process-wide `unhandledRejection` handler (error-reporting.ts:121-124) logs and reports to Discord but does not retry, so a Redis/DB blip silently loses the daily counter increment, cache invalidations, and pending-score processing, and spams Discord. (`onStop` returns before its `processScore` promises settle, then `process.exit(0)` cuts them off.)
- **Fix:** Attach `.catch(logger.warn)` to each (or await inside existing try/catch); await pending `processScore` promises in `onStop`.

### M2. Queue is at-most-once with no retry/backoff/dead-letter; enqueues dropped when queue stopped (A3-06, A10-03, A10-10)
- **Files:** `queue/queue.ts:62-138`
- **Problem:** Items are popped before processing and dropped on error; there is no re-enqueue, backoff, or dead-letter. Transient failures lose work (the next cycle partially compensates for the periodic queues, but the live path never retries). `add()`/`addAll()` silently return when stopped, and every `processQueue()`/`add()` call site is fire-and-forget — a Redis rejection stalls the queue until the next 10-minute tick. `addAll` (unused dead code) serializes the whole array as one list element — a latent corruption bug if ever called.
- **Fix:** Ack-after-success or bounded requeue; `.catch` + re-schedule on `processQueue()` failures; fix or remove `addAll`; warn when adding to a stopped queue.

### M3. Score insert paths outside the websocket listener never invalidate player caches (A9-03, A9-02, A9-08, A9-07, A6-12)
- **Files:** `player-scores.service.ts:153-168`, `leaderboard-score-seed-queue.ts:78-93`, `track-score-listener.ts:58-62`, `player-score-history.service.ts:142-149`, `player-core.service.ts:291-296`, `beatleader.service.ts:108`
- **Problem:** Only `TrackScoreListener` invalidates caches on score insert. The leaderboard seed queue and the missing-score refresh path insert scores with zero invalidation, so `PLAYER_PPS`, `PLAYER_SCORE_STATISTICS`, `PLAYER_HMD_BREAKDOWN` (1h TTL), the score-history graph (1h Redis TTL), and mini-rankings serve stale data after new scores land. Specifically: the `score-history-graph` key is never invalidated even on the websocket path (the listener has `leaderboard.id` in scope); `updatePeakRank` doesn't invalidate the full player cache; BL inserts never invalidate `beatleader-score:*` keys.
- **Fix:** Centralize invalidation in `ScoreCoreService.trackScoreSaberScore`/`insertScoreData` (playerId-keyed caches + `scoreHistoryGraphCacheKey`) and in `trackBeatLeaderScore`.

### M4. Shared ioredis client: no error listener, unbounded offline queueing — requests hang during Redis outages (A9-04, A9-05)
- **Files:** `common/redis.ts:7-16`, `metrics/impl/backend/redis-health.ts:37-53`
- **Problem:** `new Redis(env.REDIS_URL)` with no options: no `error` listener, `enableOfflineQueue` default true, retry forever. During an outage every cache/queue op queues indefinitely instead of rejecting; the Redis health metric awaits `ping()` (which is queued), so the prometheus collect callback hangs — blocking the whole `/metrics` scrape — and `redisUpGauge` stays at 1 while Redis is down. Misleading import-time logs ("Connected to Redis :)") print before any connection exists; `testRedisConnection` is never called.
- **Fix:** Attach an `error` listener, set `enableOfflineQueue: false` (or short `maxRetriesPerRequest`), race the health ping against a timeout, and reset `redisPingMsGauge` on failure.

### M5. BL insert is a bare INSERT after check-then-act — concurrent duplicates throw unique violations (A3-05, A4-05)
- **Files:** `beatleader-scores.repository.ts:15-21`, `beatleader.service.ts:69-72`, `track-score-listener.ts:31-47`
- **Problem:** The BL insert has no `onConflictDoNothing`; the seed queue (concurrency 4) and the live path can insert the same scoreId concurrently. In the live listener the BL insert is **awaited before** the ScoreSaber tracking, so a duplicate/race aborting it also silently loses the ScoreSaber score event.
- **Fix:** Make the insert conflict-safe (`onConflictDoNothing` on id) and wrap BL tracking in its own try/catch inside `onScoreReceived` so it can never abort the SS score save.

### M6. Leaderboard `plays` counter is overwritten from websocket snapshots — concurrent events regress plays (A3-04, A10-11)
- **Files:** `platform-score-handlers.ts:294-302`
- **Problem:** Every event writes `plays: scoreLeaderboard.plays + 1` from the socket payload; handlers run concurrently and each write clobbers the others. `maxScore` is also rewritten unconditionally. Drift is user-visible in leaderboard ordering and seed selection.
- **Fix:** Increment in SQL (`plays = plays + 1`), drop the unconditional maxScore write.

### M7. Score events inserted before tracking and without dedup — untracked/duplicated plays inflate trends and plays (A3-08)
- **Files:** `score-event.service.ts:20-24`, `platform-score-handlers.ts:308-309`, `schema.ts:493-511`
- **Problem:** `insertScoreEvent` runs before the listeners confirm the score was tracked, and the events table has no unique key. Duplicate processing of the same play (timeout sweep + late socket match) produces duplicate rows; the trending/daily-plays aggregations count them.
- **Fix:** Insert the event only after `trackScoreSaberScore` confirms tracking; add a dedup key (e.g. unique scoreId) or `onConflictDoNothing`.

### M8. BL seed queue re-enqueues every unseeded player every 10 minutes — no limit, no progress check (A4-06, A3-07)
- **Files:** `player-beatleader-score-seed-queue.ts:34-57`, `scoresaber-accounts.repository.ts:78-85`, `player-history.service.ts:108-117`
- **Problem:** `insertPlayers` selects **all** `seededBeatLeaderScores = false` accounts (no LIMIT) and enqueues them in one burst whenever the queue is idle; players are enqueued from two independent producers (queue tick + `PlayerHistoryService`), producing duplicates. Sequential awaited `lpush` per player/leaderboard every 10 minutes (same in `LeaderboardScoreSeedQueue.insertLeaderboards` and `FetchMissingScoresQueue.addPlayersToQueue`).
- **Fix:** Batch enqueue (`addAll`, fixed first), cap per-cycle batch size, dedupe producers, add per-player backoff.

### M9. BL timeset converted with unconditional `*1000` in two places while `beatLeaderTimesetToMs` is used everywhere else (A4-07, A11-05)
- **Files:** `beatleader.service.ts:85,534` vs `beatleader-utils.ts:14-17`
- **Problem:** The util exists to pass values >= 1e12 (already-ms) through unchanged; the insert path multiplies raw timeset by 1000 unconditionally. If any BL source ever returns ms timestamps, stored `beatleader-scores.timestamp` becomes year ~58,000, corrupting ordering and previous-score lookups. Latent today (live API returns seconds).
- **Fix:** Use `new Date(beatLeaderTimesetToMs(scoreToken.timeset))` in both places.

### M10. BeatLeader replay ID embeds the attributed SSR account ID instead of the BL player ID — replay 404s for linked alts (A11-01)
- **Files:** `beatleader.service.ts:67,82-83,297-298,512`, `common/src/utils/beatleader-utils.ts:39`
- **Problem:** Since `21800d04`, `trackBeatLeaderScore` substitutes `playerId = account.id` into the score token, and `getBeatLeaderReplayId` embeds that into the replay file name (`scoreId-playerId-difficulty-characteristic-hash.bsor`). BL's CDN stores the file under the **BL player's** ID, so for exactly the players the attribution logic targets (BL ID ≠ SS account ID) the download 404s, `savedReplay` stays false, and the replay button is dead. Works when IDs match, masking the bug.
- **Fix:** Keep the BL player ID for the replay file name (store a `blPlayerId` or pass `scoreToken.playerId` into the replay-id path).

### M11. Star-change rows recorded before the upsert and duplicated on partial failure (A7-03)
- **Files:** `leaderboard-ranked-sync.service.ts:71-101`
- **Problem:** Star changes are recorded and history reweighted per leaderboard *before* the batched upsert; a crash/throw between them re-detects the same change next run → duplicate star-change rows. The cron has no try/catch.
- **Fix:** Record star changes after (or in the same transaction as) the upsert; make insertRow idempotent (key on leaderboardId + old/new stars).

### M12. `z.coerce.boolean()` maps `"false"` to `true`, inverting ranked/qualified/includeInactives filters (A7-04, A8-12)
- **Files:** `common/src/schemas/scoresaber/leaderboard/query-filters.ts:15-16`, `player-ranking.controller.ts:28`
- **Problem:** `Boolean("false")` is true in zod 4's coercion, so `?ranked=false` returns only ranked maps. The first-party website never sends `false` (ssr-api.ts only spreads truthy values), so this is a latent API-contract bug for third-party clients.
- **Fix:** `z.enum(["true","false"]).transform(v => v === "true")`.

### M13. `ranked=false`/`qualified=false` semantics — see M12 (same finding, alternate slice)
- Merged into M12.

### M14. Playlist settings parsed via unvalidated `JSON.parse` — user error yields 500s, contradictory ranges accepted (A8-06)
- **Files:** `common/src/playlist/ranked/custom-ranked-playlist.ts:20-41`, `self-playlist-utils.ts:9-29`, `snipe-playlist-utils.ts:10-31`
- **Problem:** The defined zod schemas are never used; malformed base64/JSON → SyntaxError → 500; `{}` → TypeError at `settings.stars.min` → 500; `{stars:{min:99,max:1}}` silently returns an empty playlist instead of 400. Routes are unauthenticated, so clients can spam Discord error reports.
- **Fix:** Parse decoded JSON with the zod schemas in try/catch → 400; add min≤max validation.

### M15. Custom ranked playlist `syncURL` points to a nonexistent route with the wrong param name (A8-07)
- **Files:** `playlist.service.ts:234`, `playlist.controller.ts:26-34`
- **Problem:** Generated `syncURL` is `/playlist/custom-ranked-maps?settings=...` but the route is `/playlist/scoresaber-custom-ranked-maps` with a required `config` param — any syncing client gets 404/422.
- **Fix:** Align the syncURL with the actual route/param.

### M16. Playlist 404s re-wrapped as 500s (A8-05, A12-03)
- **Files:** `playlist.service.ts:302-305,431-434`
- **Problem:** Expected `NotFoundError`s ("user isn't tracked", "user has no scores") are caught and rethrown as `InternalServerError`, producing 500s, Discord error spam on routine user error, and no client-visible 404.
- **Fix:** Re-throw HTTP errors as-is; wrap only unexpected errors.

### M17. Global `onError` echoes raw `error.message` on 500s — internal detail disclosure (A8-14, A12-04)
- **Files:** `index.ts:237-246`
- **Problem:** Any 500 returns `{ statusCode: 500, message: error.message }`; combined with M21/M24/M25 this leaks PostgreSQL/driver error text (e.g. `invalid input syntax for type bigint: "2.5"`) to unauthenticated clients.
- **Fix:** Return a generic message for 5xx; surface details only for explicit 4xx.

### M18. Fractional/non-integer `page` params reach Postgres as fractional LIMIT/OFFSET → 500 (A8-04)
- **Files:** `scores.controller.ts:204-205` (and every paginated route), `pagination.ts:59`
- **Problem:** `z.coerce.number()` accepts floats; `?page=1.1&limit=25` → `OFFSET 2.5` → PG `invalid input syntax for type bigint` → 500 + Discord report. Nondeterministic per value.
- **Fix:** `z.coerce.number().int().min(1)` (+ sane max) for all page/limit params — a shared schema.

### M19. Unbounded `count` on `/player/history` → Invalid-Date 500s and unlimited history fetches (A8-03)
- **Files:** `player.controller.ts:139-142`, `player-history.service.ts:276`
- **Problem:** Any positive integer passes; `count >= ~1e8` days overflows the Date (Invalid Date → RangeError in the pg driver → 500); counts between ~3660 and ~1e8 degenerate into full-history fetches with effectively unlimited pagination.
- **Fix:** Cap `count` (e.g. `.max(3660)`) or normalize to the `-1` allTime path; validate the derived date before querying.

### M20. `playerIds` query param has no size cap — unbounded IN clause on the 80M-row table (A6-05, A8-13)
- **Files:** `common/src/schemas/score/query/player-scores-query.ts:4-13`, `player-scores.service.ts:373,433`
- **Problem:** A comma-separated list with no `.max()` and no ID format check flows into `inArray` for both the count and page queries on the largest table; junk strings pass through as bigint casts. The friend endpoint caps at 16 by contrast.
- **Fix:** Cap the array (e.g. `.max(20)`) and validate each entry as a digit string.

### M21. User-controlled `search`/`country` strings raw-interpolated into upstream URLs — query-parameter injection (A8-08)
- **Files:** `scoresaber-api.service.ts:284,421,106`
- **Problem:** `&search=${search}` / `&countries=${country}` without `encodeURIComponent`; values come from unvalidated query params. After the proxy decodes the encoded URL, characters like `&`/`=` inject additional upstream parameters (e.g. overriding page/limit), and every returned score is parsed and upserted into the DB. Fixed host limits it to param injection (no full SSRF).
- **Fix:** `encodeURIComponent` the values and cap their length in the route schema.

### M22. `/beatsaver/map/:hash` accepts arbitrary strings — path traversal into other BeatSaver endpoints, DB write on miss, cooldown starvation (A8-09, A5-12)
- **Files:** `beatsaver.controller.ts:22-26`, `common/src/api-service/impl/beatsaver.ts:8-9,32`, `beatsaver.service.ts:41`
- **Problem:** `hash: z.string()` with no hex/length constraint. A hash with `/../../` normalizes into other `api.beatsaver.com` endpoints; on a miss the fetched body is cast and persisted (`saveMap` → `upsertMap`), and >64-char hashes overflow the varchar(64) column → 500. Negative lookups are not cached, so nonexistent hashes re-hit upstream on every request, consuming the global 10 req/s BeatSaver cooldown shared with legitimate traffic.
- **Fix:** Validate hash as hex of the expected length; cache negative results for a short TTL; rate-limit the route.

### M23. `/statistics` recomputes all raw counts on every request, including a full count scan over `beatleader-scores` (A8-10)
- **Files:** `app.service.ts:136-154,170-181`, `beatleader-scores.repository.ts:89-95`
- **Problem:** `getAppStatistics` runs 5 count queries per request; four hit the small `ssr_table_counts` row, but `countSavedReplays` scans `beatleader-scores WHERE savedReplay = true` (multi-million rows) on every landing-page visit, unauthenticated and uncached — even though the service already samples these exact values every minute.
- **Fix:** Serve the latest sampled values (with on-demand fallback), or add savedReplay counts to the nightly-reconciled table counts.

### M24. Empty leaderboards never satisfy the seed-loop termination condition (A5-06)
- **Files:** `leaderboard-score-seed-queue.ts:61-99`
- **Problem:** For `total = 0`, `totalPages = 0` and `page === totalPages` never becomes true; the loop fetches pages 1, 2, 3… until two consecutive failures abort — and 0-play leaderboards are exactly the ones selected first (`orderBy(plays)`), so workers can spin on empty boards hammering the SS API.
- **Fix:** Terminate when `page > totalPages` (or `page >= Math.max(1, totalPages)`); treat `total === 0` as complete.

### M25. Unknown SS modifier throws and poisons whole pages / leaderboard seeding (A5-08, A6-07)
- **Files:** `common/src/token-creators.ts:136-143`, `leaderboard-score-seed-queue.ts:71-73`, `player-scores.service.ts:292-296`
- **Problem:** `getScoreSaberScoreFromToken` throws `Unknown modifier: ${mod}` inside `response.scores.map(...)`: one new SS modifier rejects the entire seed page (leaderboard stays unseeded, re-fetches the same failing page every 10 min), drops the score on the live websocket path, and 500s the whole live-scores page (7 good scores lost because 1 is malformed).
- **Fix:** Skip/keep unknown modifiers as opaque instead of throwing; per-score try/catch in the page loops.

### M26. `getAllLeaderboards` recomputes `totalPages` with an unguarded division; a failed page truncates the catalog (A5-11, A7-06)
- **Files:** `scoresaber-api.service.ts:503-528`, `leaderboard-ranked-sync.service.ts:104`
- **Problem:** `Math.ceil(totalItems / itemsPerPage)` can be `Infinity`/`NaN` if itemsPerPage is 0 → infinite page loop; and a single failed page is treated as end-of-data, silently truncating the ranked/qualified sync, which then reports "Updated X/Y" as if complete.
- **Fix:** Use the API-provided `metadata.totalPages` with guards; retry failed pages with backoff; abort loudly instead of truncating.

### M27. `RateLimitError` escapes `ApiService.fetch` as a thrown exception while every other failure returns `undefined` (A5-07)
- **Files:** `common/src/api-service/api-service.ts:138-166`, `common/src/utils/request.ts:62-64`
- **Problem:** BeatSaver 429s throw instead of returning undefined; internal/fire-and-forget callers get unhandled rejections, and behavior is inconsistent across the codebase. No retry/backoff on 429s anywhere.
- **Fix:** Catch `RateLimitError` in `ApiService.fetch` and return undefined (or handle it consistently); ideally add backoff.

### M28. No rate limiting on ScoreSaber API traffic — seed workers hammer the shared proxy (A5-10)
- **Files:** `scoresaber-api.service.ts:84-149`
- **Problem:** Unlike BeatSaver (10 req/s Cooldown), the SS API service has no throttle; 10 seed workers + player backfills fetch pages as fast as responses arrive, guaranteeing 429s, which the code then misreads as page failures (H2/H15). The `priority?: CooldownPriority` option is declared but never used.
- **Fix:** Add a Cooldown with background-priority support and pass `options.priority` through.

### M29. Mini-ranking performs ~100–200 `getPlayer`/DB queries per request (A6-04)
- **Files:** `mini-ranking.service.ts:72-91`, `scoresaber-player.service.ts:61-62`
- **Problem:** Each page of the mini-ranking widget resolves every listed player through `CacheService.fetch(SCORESABER_PLAYER, …)` → on TTL miss a DB query per player; a cold request issues ~200 queries against the accounts table, repeated as the 2-minute TTL expires.
- **Fix:** Batch account lookups with `findManyByIds` for the page's ids and construct basic player objects from the page tokens.

### M31. `parseRankHistory` v2 regression left rank-history fallback and seeding dead (A6-03)
- **Files:** `common/src/utils/player-utils.ts:85-87`, `player-history.service.ts:245-257,296-338,371-394`
- **Problem:** Commit `90384444` changed `parseRankHistory` to return `[today's rank]` only, but consumers still expect a multi-day array: the fallback guard `daysAgo < playerRankHistory.length` (length 1) is unreachable for `daysAgo >= 1`, the backfill loop starts at `historyLength - 2 = -1` and never iterates, and seeding writes only today's rank. Past-date history requests silently return no rank for players without a DB row.
- **Fix:** Drop the dead fallback/seed code and rely on DB history, or restore a real rank-history source.

### M32. BL score seeding tracks scores one-by-one and fires an API stats fetch per new score (A6-10)
- **Files:** `player-beatleader-scores.service.ts:119-132`, `beatleader.service.ts:112`
- **Problem:** Sequential awaited `trackBeatLeaderScore` per score (up to 100/page), plus a fire-and-forget external stats API call per new score — thousands of API requests for a player with many scores, all serialized.
- **Fix:** Chunk with a concurrency cap per page; rate-limit/batch `saveScoreStats`.

### M33. Bulk history reweight issues one UPDATE per row inside a single transaction (A2-03, A7-05)
- **Files:** `scoresaber-score-history.repository.ts:233-252`, `player-score-history.service.ts:32`, `leaderboard-ranked-sync.service.ts:71-72`
- **Problem:** `bulkUpsetHistoryScores` runs N single-row UPDATEs via `Promise.all` in one transaction (serialized on one pooled connection), after loading every row into memory. A star change on a popular map means tens of thousands of round trips blocking the ranked-sync job.
- **Fix:** Single bulk statement (CASE/VALUES update) or chunked multi-row upserts.

### M34. `findPlayerIdsInTimeRange` scans each candidate's full score history — no `(playerId, timestamp)` index (A2-04)
- **Files:** `scoresaber-scores.repository.ts:61-74`, `beatleader.service.ts:408-416`, `schema.ts:174-189`
- **Problem:** New code from `21800d04` filters `playerId IN (...) AND timestamp BETWEEN ...`; the scores table has no timestamp index, so the ±5-minute window is applied by scanning every row of each candidate (thousands of rows for active players), on the BL ingestion hot path for multi-account players.
- **Fix:** Add an index on `(playerId, timestamp)`.

### M35. `upsertByPlayerAndDate` clobbers stored fields with NULL when given a partial history object (A2-06)
- **Files:** `player-history.repository.ts:26-57`, `player-history.service.ts:403-433`
- **Problem:** ON CONFLICT DO UPDATE sets every column to `excluded.<col>`; any field absent from the incoming object evaluates to NULL and wipes the stored value. Latent today (the only caller fills every field) but the repository's parameter type permits partials.
- **Fix:** Only set columns present in `data`.

### M36. Migration journal: 11 entries reference snapshot files absent from the repo (A1-01)
- **Files:** `drizzle/meta/_journal.json`, `drizzle/meta/*_snapshot.json`
- **Problem:** Verified via `git ls-files`: snapshots for 0005, 0008, 0009, 0014-0018, 0027, 0039, 0040 are missing (exactly the hand-written migrations). `drizzle-kit generate` still works (diffs against 0047), but history integrity is broken: intermediate states can't be reproduced, and regenerating `meta/` would silently lose these migrations' history.
- **Fix:** Commit snapshot files for the 11 missing migrations (`drizzle-kit generate --custom` / `pull` per state).

### M37. Non-monotonic journal `when` timestamps can cause silent migration skips (A1-02)
- **Files:** `drizzle/meta/_journal.json:56-109`
- **Problem:** `when` for 0005 > 0006/0007 and 0012 > 0013. drizzle's runtime migrator applies a migration only when `lastDbMigration.created_at < migration.when`; a partially migrated DB (older migrator/manual apply) would skip 0006/0007/0013 silently, leaving beatsaver tables, hmd defaults, and leaderboard indexes missing while later migrations assume they exist.
- **Fix:** Make `when` strictly increasing in entry order (or switch to hash/id-based applied tracking).

### M38. `avatar` column: migration SQL produces nullable column with no default, contradicting schema/snapshot (A1-04)
- **Files:** `drizzle/0002_*.sql`, `drizzle/0042_goofy_molten_man.sql`, `schema.ts:27`
- **Problem:** 0002 adds nullable `avatar` with the unknown.png default; 0042's `ADD COLUMN IF NOT EXISTS ... NOT NULL DEFAULT ''` + `DROP DEFAULT` is a no-op on existing DBs and removes the default — net DB state is nullable, no default, while schema.ts/snapshot 0047 declare `NOT NULL DEFAULT 'unknown.png'`. Fresh DBs diverge from the declared schema; `drizzle-kit push` would fail if any NULLs exist.
- **Fix:** Rewrite 0042 to set the default and NOT NULL state-correctly (backfilling NULLs), or align schema.ts with reality.

### M39. Row-level AFTER INSERT/DELETE triggers serialize score writes on the single `ssr_table_counts` row (A1-08)
- **Files:** `drizzle/0043_table_counts_triggers.sql:31-66`, `drizzle/0045_*.sql`
- **Problem:** Every score insert/delete fires a trigger that `UPDATE ssr_table_counts ... WHERE id = 1`; all concurrent ingestion transactions contend for the one row lock, and each batch pays N extra UPDATEs on the hottest write table.
- **Fix:** Statement-level triggers (update once per statement) or debounced reconcile.

### M40. CORS reflect-any-origin + credentials by default (A12-05)
- **Files:** `index.ts:263`
- **Problem:** `.use(cors())` uses @elysiajs/cors defaults: any origin reflected + `credentials: true`. No cookies are used today, but this is a CSRF/credential hole waiting for any cookie-based auth, and advertises arbitrary-origin access.
- **Fix:** Pin origins (ssr.fascinated.cc + website) and set `credentials: false`.

### M41. Public `/ws/score` websocket: no auth, no connection cap, fan-out amplification on every score event (A12-07, A10-09)
- **Files:** `index.ts:346-351`, `websocket/websocket.ts:10-48`, `websocket/impl/score-websocket.ts:5-9`
- **Problem:** Any client can connect; every connection is stored and every tracked score is serialized and sent to each client. Slow/stalled clients make Bun buffer broadcasts without bound (`send` result / `getBufferedAmount` never checked), and there's no max clients. An attacker can inflate memory and multiply per-event work on the hot ingestion path.
- **Fix:** Cap connections (per-IP and global), check backpressure and close slow clients, set `maxPayload`, consider token auth on open.

### M42. Playlist generation runs unbounded full-table queries with no caching or rate limit (A12-06)
- **Files:** `playlist.controller.ts:25-40`, `playlist.service.ts:213-246`, `scoresaber-leaderboards.repository.ts:186-196`
- **Problem:** `/playlist/scoresaber-*` selects the entire filtered leaderboard set (up to the full ~105k rows) with no `.limit()`, serialized per request, unauthenticated and uncached — full-table scans + large responses on demand.
- **Fix:** Cache generated playlists (TTL keyed by config), add a row cap/streaming, rate-limit.

### M43. `getQueryParamsFromObject` builds the URL from the unfiltered params — leaks `undefined`/empty values (A11-03)
- **Files:** `common/src/utils/utils.ts:98-106`
- **Problem:** `filteredQueryParams` is computed but the URL is built from the original `params` (dead-code filter); `{b: undefined}` serializes as `?b=undefined`. Callers mostly pre-guard, so impact is latent.
- **Fix:** Build from the filtered object.

### M44. HTTP metrics hooks never observe error responses and leak `requestStartTimes` entries (A11-04)
- **Files:** `plugins/http-metrics.hooks.ts:85-117`
- **Problem:** Only `onRequest`/`onAfterHandle` are implemented; validation errors and unmatched routes go to `onError`, so `http_responses_total`/`response_time_ms` miss all 4xx/5xx, and every failing request leaves its entry (and Request object) in `requestStartTimes` forever — a memory leak under sustained malformed traffic.
- **Fix:** Add an `onError` hook that records status, increments the counter, and deletes the entry.

### M45. Cache hit-ratio gauge mixes REDIS and MEMORY modes despite per-mode labels (A11-02)
- **Files:** `metrics/impl/backend/cache-performance.ts:6,33-44`
- **Problem:** Counters are per-mode but the ratio maps are keyed by cacheId only; both mode series report the same combined ratio, diverging from the counters.
- **Fix:** Key the maps by `cacheId:mode`.

### M46. `fetch-missing-player-scores` bot command has no `deferReply` and re-replies in catch (A11-06)
- **Files:** `bot/command/fetch-missing-player-scores.ts:55-69`
- **Problem:** Slow API lookups exceed Discord's 3s reply window; the reply fails, the catch re-replies (also failing), the message is lost, and `fetchMissingPlayerScores` is un-awaited/un-caught.
- **Fix:** `deferReply()` first, `editReply` for both outcomes, await the service call.

### M47. `refresh-leaderboards-cron` (and 4 other crons) lack try/catch and error reporting; batch notifications lost on failure (A7-08)
- **Files:** `index.ts:107-121` (also 163-196)
- **Problem:** Only 2 of 7 crons wrap errors (`player-statistics-tracker-cron`, `refresh-medal-scores`). The leaderboard sync cron runs bare: a mid-loop throw skips `refreshQualifiedLeaderboards` and goes unreported; worse, if `handleRankedBatch` throws after the DB updated, the Discord notification is lost permanently.
- **Fix:** Wrap cron bodies in try/catch + `reportErrorToDiscord`; make the notification step resilient.

### M48. Redis health metric + cache `invalidate()` semantics (A9-06)
- **Files:** `cache.service.ts:222-242`
- **Problem:** `invalidate` doesn't clear in-flight fetches (a fetch that started before invalidation re-populates the cache with pre-write data) and awaits `redisClient.del` before clearing memory caches — during a Redis outage (M4) memory invalidation never runs.
- **Fix:** Clear/check in-flight entries; clear memory caches before (or un-awaited parallel with) the Redis del.

---

## Low

### L1. Websocket payloads JSON.parsed and cast without schema validation; `playerInfo!`/`player!` non-null assertions on nullable fields (A10-12, A4-08)
- **Files:** `common/src/websocket/websocket.ts:163-175`, `platform-score-handlers.ts:192,194`, `track-score-listener.ts:28`
- **Problem:** Upstream socket messages are parsed and cast directly with no zod validation and no `maxPayloadLength` (100 MiB default). `beatLeaderScore.player!` (line 194) and `score.playerInfo!` (track-score-listener.ts:28) — the schema declares both nullable/optional — throw TypeErrors that are caught and silently drop the score. The REST API demonstrably returns `player: null`, so the websocket variant is plausible.
- **Fix:** Validate at the socket boundary; guard the non-null assertions; set a max payload length.

### L2. Hardcoded player-ID remap hack in the realtime handler (own finding)
- **Files:** `platform-score-handlers.ts:178-181`
- **Problem:** `if (beatLeaderScore.playerId == "335393") { beatLeaderScore.playerId = "76561198979484227"; }` — a hardcoded special case with an emoji-laden comment ("a reallyyyyyyyyyyyyyyy jank fix because ell"). Mutates the parsed token before keying; will break silently if BL ever changes this player's ID.
- **Fix:** Remove or move to a configurable mapping table.

### L3. `onStop`/sweep drop pending scores during shutdown (A10-07 — see M1)
- Covered by M1.

### L4. Pending-score map sweep cadence (60s) vs 10s timeout; O(n) scans per event (A10-08)
- **Files:** `platform-score-handlers.ts:49-122`
- **Problem:** Entries linger up to ~70s; every incoming score scans all pending entries and issues an awaited `isSamePlayer` DB lookup per time-window candidate — several DB round-trips per live event on popular maps.
- **Fix:** Shorter sweep; index pending by mapKey/time bucket.

### L5. `processQueue` race can exceed configured concurrency (A10-04)
- **Files:** `queue/queue.ts:95-107`
- **Problem:** The `activeWorkers < concurrency` gate is checked before the awaited pop; concurrent `processQueue` invocations can both pass the gate, exceeding concurrency (FIFO order violated with concurrency 1).
- **Fix:** Reserve the slot before the pop or serialize with a mutex.

### L6. `hasItem` dedupe only checks the list head — duplicate queue entries accumulate (A10-05)
- **Files:** `queue/queue.ts:153-155`, `player-core.service.ts:168`
- **Problem:** Only `lindex(0)` is compared; items deeper in the list pass the guard and get enqueued again.
- **Fix:** Check full membership (Redis set of queued ids) or drop the pre-check.

### L7. `insertAttempt` silently drops attempts with a score identical to an existing history row (A2-07)
- **Files:** `scoresaber-score-history.repository.ts:116-122`, `schema.ts:230-234`
- **Problem:** Unique index (leaderboardId, playerId, score) + onConflictDoNothing discards new attempts (and PB snapshots) whose score equals an earlier row even though timestamp/accuracy/pp differ — repeated same-score plays are untrackable and history can have gaps.
- **Fix:** Add scoreId/timestamp to the conflict target if identical-score attempts should be kept; otherwise document the dedup.

### L8. Lost daily-counter increment: read-modify-write race between `incrementDailyCounter` and `upsertByPlayerAndDate` (A2-08)
- **Files:** `player-history.repository.ts:104-135`, `player-history.service.ts:190-198`
- **Problem:** The daily sync reads the row, builds a full entry, and rewrites all columns — a score-event increment between read and write is overwritten. Small window, occasional off-by-one.
- **Fix:** Apply increments in the same statement as the snapshot write.

### L9. `BeatSaverRepository.upsertMap` mutates the caller's token (lowercases hashes in place) (A2-09)
- **Files:** `beatsaver.repository.ts:42-45`
- **Fix:** Build normalized hashes into the row arrays instead of mutating input.

### L10. `scoreId` type declaration mismatch: token declares `string`, schema requires `z.number()` (A2-05)
- **Files:** `common/src/types/token/scoresaber/v1/score.ts:5`, `common/src/schemas/scoresaber/score/score.ts:15`, `token-creators.ts:149`
- **Problem:** `ScoreSaberScoreToken.id: string` but the schema parses `scoreId: z.number()`. Verified the live API sends JSON numbers, so runtime is safe today — but one declaration is definitively wrong, and any future string-typed id throws on parse.
- **Fix:** Reconcile the declarations (`id: number` in the token, or `z.coerce.number()` in the schema).

### L11. `getPlayerRanking` returns NaN `totalPages` when the API responds with no page (A6-11)
- **Files:** `player-search.service.ts:100-109`
- **Problem:** `Math.ceil(0/0)` → NaN → serializes as null; breaks client pagination and masks the upstream failure as a 200 with empty items.
- **Fix:** Return an empty page when `foundPlayers` is undefined; guard `itemsPerPage > 0`.

### L12. Scores chart returns the player's entire ranked history without a limit (A6-06)
- **Files:** `scoresaber-scores.repository.ts:365-381`
- **Fix:** Add a limit/downsample server-side.

### L13. `upsertScoresFromApi` silently drops older attempts instead of archiving them to history (A6-08)
- **Files:** `score-core.service.ts:178-223`
- **Problem:** Non-PB attempts violate the (playerId, leaderboardId) unique constraint, the per-score fallback fails and discards them at debug level — history coverage depends on which ingestion path recorded the play.
- **Fix:** On unique violation in the fallback, call `insertAttempt` for the older row.

### L14. Ranked leaderboard medal refreshes run sequentially after score seeding (A6-09)
- **Files:** `player-scores.service.ts:198-200`
- **Fix:** Bounded-concurrency batch.

### L15. `update-player-medals` never edits its reply on success (A11-07)
- **Files:** `bot/command/update-player-medals.ts:16`
- **Fix:** `editReply` after the service call succeeds.

### L16. Bot `interactionCreate` try/catch ineffective for async errors; can re-reply to handled interactions (A11-08)
- **Files:** `bot/bot.ts:54-66`
- **Fix:** Await the execute call; branch on `interaction.replied/deferred`.

### L17. `sendFile` lacks the `DISCORD_BOT_TOKEN` guard the other channel helpers have (A11-09)
- **Files:** `bot/bot.ts:162`
- **Fix:** Add `|| !env.DISCORD_BOT_TOKEN` to the guard.

### L18. `isServer()` second clause always false: `typeof window == undefined` (A11-10)
- **Files:** `common/src/utils/utils.ts:14-18`
- **Problem:** Compares a string to `undefined` — always false; the non-backend fallback is dead code.
- **Fix:** `typeof window === "undefined"`.

### L19. Metric names violate Prometheus conventions (`*_total` on gauges) (A11-11)
- **Files:** `metrics/impl/backend/api-services.ts:12,33`, `total-requests.ts:12`
- **Fix:** Rename gauges without `_total` (or convert to counters).

### L20. `ActiveAccountsMetric` interval callback has no error handling (A11-12)
- **Files:** `metrics/impl/player/active-accounts.ts:11`
- **Fix:** try/catch + log; keep stale value.

### L21. `invalidate()` doesn't clear in-flight fetches; memory invalidation blocked on Redis (A9-06) — see M48
- Merged into M48.

### L22. Cache hit ratio counts unparseable Redis entries as hits (A9-09)
- **Files:** `cache.service.ts:100-108,181-189`
- **Problem:** `recordHit` runs before parse; a corrupted entry records hit+miss, polluting the ratio that's meant to surface cache health.
- **Fix:** Record the hit after successful parse.

### L23. Startup race: first `persistValues` tick can overwrite freshly loaded persisted metrics (A9-10)
- **Files:** `metrics.service.ts:117-118,168-219`
- **Fix:** Await `loadPersistedValues()` before starting the persistence loop.

### L24. Memory-mode caches return stored objects by shared reference — mutation poisons the cache (A9-12)
- **Files:** `cache.service.ts:110-116,191-196`, `cache.ts:77-87`, `storage.service.ts:42-54,68-76`
- **Problem:** No current caller mutates cached objects [INFERENCE], but nothing prevents it (controllers return cached objects directly); Buffers are shared between callers and the file cache.
- **Fix:** Copy/freeze on get for consumer-visible namespaces; return Buffer copies from StorageService.

### L25. `characteristic` column: varchar(128) in SQL history vs text in schema — silent drift (A1-05)
- **Files:** `drizzle/0000_initial.sql:95-96`, `schema.ts:154,203`
- **Fix:** One-time ALTER to text, or align schema to varchar(128).

### L26. Score/leaderboard IDs stored as int4 — fits today, overflow-prone vs upstream 64-bit IDs (A1-06)
- **Files:** `schema.ts:148,199,321`
- **Problem:** Verified live: SS score ids up to ~92M, BL up to ~33M — fits int4 today, but both ID spaces grow by millions/year; if upstream ever emits >2^31-1, every insert fails (`integer out of range`) and takes down ingestion (scoreId is the PK/conflict target). Headroom is years, not a current bug.
- **Fix:** Migrate the three columns to `bigint` proactively.

### L27. `runMigrations` has no advisory lock — concurrent instance startups can race on DDL (A1-09)
- **Files:** `db/run-migrations.ts:19-24`
- **Fix:** `pg_advisory_lock` around migration apply.

### L28. Playlist settings star-range contradictions silently accepted (A8-06 — see M14)
- Merged into M14.

### L29. Fractional page on `/scores/top` — see M18
- Merged into M18.

### L30. `beatleader-score` cache never invalidated on BL insert (A9-07) — see M3
- Merged into M3.

---

## Info / Positive findings

- **I1. BigInt audit of the HTTP layer is clean (A8-15):** ScoreSaber player IDs are strings end-to-end (17-18 digits never pass through `Number()`); the only `parseInt` (replay `scoreId`) is safe because BL score ids are int4.
- **I2. Account resolution design is sound (own verification):** `resolveAccountForBlPlayer` disambiguates multi-account players by play-time window and falls back to most-recently-active — good design, currently unreachable for the linked-ID cases it was built for because of C1/H7.
- **I3. Queue metrics / events manager are correct (A10-13):** no division-by-zero, failure counting works, listener dedupe is sound.
- **I4. Dependencies are current (mid-2026); no obvious CVE candidates (A12-09):** minor hygiene: `dotenv` and `@dotenvx/dotenvx` both present (redundant).
- **I5. Public `/swagger` + relaxed security headers (hsts/CSP off) are deliberate but undocumented (A12-10).** HSTS recommended on the API host.
- **I6. `t3-env` validation is disabled (`skipValidation: true`, env.ts:125) — misconfigs surface only at runtime (A12-08);** an empty `PROMETHEUS_AUTH_TOKEN` in prod makes `/metrics` return 500 at scrape time instead of failing fast at boot.
- **I7. Dead cache config (A9-11):** `SCORESABER_PLAYER_EXISTS` and `SCORESABER_LEADERBOARD_STAR_CHANGE` CacheIds and `testRedisConnection` are never used — misleading to maintainers.

---

## Verification notes

- **Live API checks performed** (read-only): ScoreSaber `timeSet` format (`"2021-08-11T17:44:41.000Z"`), ScoreSaber score id magnitude (≤ ~92M), ScoreSaber `/v2/players/count` (`{"count":37598}`), BeatLeader `scoreImprovement` with `includeIO=false` (`null`) vs `includeIO=true` (object), BeatLeader score id magnitude (≤ ~33M).
- **Rejected finding (false positive):** one agent reported that SS `timeSet` is unix-seconds and `new Date(token.timeSet)` produces Invalid Dates (A5-01). This was **disproven** by the live API — `timeSet` is ISO-8601 and `new Date()` parses it correctly. The real bug is the *pairing* code feeding ISO strings to `beatLeaderTimesetToMs` (C2). The related latent inconsistency (unconditional `timeset * 1000` in the BL insert path) is preserved as M9.
- **Severity adjustments:** A3-03's claim that fire-and-forget rejections "crash the whole backend" was downgraded to Medium — `registerGlobalErrorHandlers` intercepts `unhandledRejection` without exiting; the real impact is silent work loss + Discord noise (M1). A9-01's heap estimate was framed with the current scale (~242 replays).
- All findings were cross-checked by reading the cited code; the top-severity items (C1, C2, H2, H5, H14) were additionally reproduced/verified against live API responses or the actual query plans implied by schema indexes.

## Slice map (agent → prefix)

| Slice | Prefix | Coverage |
|---|---|---|
| Migrations & schema | A1 | drizzle/**, src/db/** |
| Repositories | A2 | src/repositories/** |
| Score ingestion | A3 | event, websocket listeners, score services, seed queues |
| BeatLeader | A4 | beatleader service/API, BL seed queue, BL repos |
| External services | A5 | ScoreSaber API, BeatSaver, replay downloads |
| Player services | A6 | src/service/player/**, statistics, streaks, medals |
| Leaderboard services | A7 | leaderboard services, ranked sync, notifications |
| Controllers/HTTP | A8 | src/controller/**, index.ts |
| Cache/infra | A9 | cache, redis, storage, metrics.service |
| Queue/events/websocket | A10 | queue/**, event/**, websocket/** |
| Bot/metrics/common | A11 | bot/**, metrics/impl/**, common/**, @ssr/common |
| Security | A12 | full backend surface, deps |
