# SSR Backend Audit — Issues

**Date:** 2026-08-07
**Scope:** `projects/backend/src/**`, `projects/common/src/**` (shared schemas/utils consumed by the backend), `projects/backend/drizzle/**` (migrations)
**Method:** 12 parallel read-only audit slices (schema/migrations, repositories, score ingestion, BeatLeader, external APIs, player services, leaderboards, HTTP/controllers, cache/infra, queue/events/websocket, bot/metrics/common, security) + independent verification. Key claims were verified against the live ScoreSaber / BeatLeader APIs and by reading the code paths end-to-end. Findings cite `file:line`; inferences are tagged `[INFERENCE]`.

---

## Summary

| Severity | Count |
| -------- | ----- |
| Critical | 0     |
| High     | 5     |
| Medium   | 37    |
| Low      | 25    |
| Info     | 7     |

**Status:** 22 of the original 97 findings are fixed (see [Recently fixed](#recently-fixed) below); 75 remain open. Finding IDs are stable — gaps (e.g. no C1/C2, no H2-H11) mean that finding has been fixed.

**Current priorities:** the highest-value remaining work is the unauthenticated/unthrottled HTTP surface that can create DB rows and enqueue full upstream scrapes (**H1**), the still-broken landing "Active Players" stat (**H14**, the fix is a one-liner: `lookupActivePlayerCount` reads `.count` off a text body), deranked maps that never lose ranked status (**H12**), and the queue/ingestion reliability items (M1, M2, M5, M6, M7). The remaining performance items are mostly index migrations (H8/H9/M34 are done; H13/M42 are query-shape fixes).

Other themes: the seed/backfill queues are at-most-once with no retry and mark work permanently complete after partial/transient failure; several hot queries scan the ~80M-row `scoresaber-scores` table without index support; the entire HTTP surface is unauthenticated and unthrottled, and GETs can create DB rows and enqueue full upstream scrapes.

---

## Recently fixed

| ID  | Finding                                                                 | Fix                         |
| --- | ----------------------------------------------------------------------- | --------------------------- |
| C1  | BL historical scores never seeded (`scoreImprovement` null vs schema)   | `30551e95`                  |
| C2  | Cross-platform realtime pairing dead (NaN timeset) + pending overwrites | `913a2dd8`                  |
| H2  | Leaderboard marked seeded after skipped/aborted scrape                  | `fe198170`                  |
| H3  | Player backfill permanently lost on transient failure                   | `1483c066`                  |
| H4  | BL seed marks player seeded on transient outage (404 vs failure)        | `41ff361e`                  |
| H5  | Replace-current path non-transactional and race-loses scores            | `91374974`                  |
| H6  | BL API calls: no retry/backoff/429 handling, no concurrency cap         | `aa318e3f`                  |
| H7  | BL player mapping only populated by completed seed                      | `3ce71c58`                  |
| H8  | Global pp-ordering queries seq-scan (partial index)                     | `d580a71c` (migration 0048) |
| H9  | score-history scoreId lookups seq-scan (index)                          | `60ba2051` (migration 0049) |
| H10 | getOrCreateAccount wipes country/clears banned without token            | `a5f6e8f7`                  |
| H11 | Player backfill never early-exits; per-page pre-filter restored | `77ac445f` |
| H14 | `lookupActivePlayerCount` reads `.count` off a text body — landing "Active Players" frozen | `52c31580` |
| H17 | Storage cache retains files/replay buffers forever (TTL) | `11c7c290` |
| M22 | /beatsaver/map/:hash accepts arbitrary strings; no negative cache       | `0147dc70`                  |
| M23 | /statistics recounts per request (serves samples)                       | `622cdc96`                  |
| M24 | Empty leaderboards never terminate the seed loop                        | `4b04fb23`                  |
| M29 | Mini-ranking ~200 queries per request (batched)                         | `d74c750c`                  |
| M31 | Dead rank-history fallback/seed code                                    | `e063b43a` (+ `dbeafb50`)   |
| M33 | Bulk history reweight: N UPDATEs → VALUES statement                     | `21f11572`                  |
| M34 | per-player time-window scans (index)                                    | `e6be9eb7` (migration 0050) |
| M39 | Row-level table-count triggers serialize writes (statement-level)       | `fd84afef` (migration 0051) |
| M47 | Crons without error handling; batch notifications lost                  | `f9eb8110`                  |

Note: H8/H9/M34/M39 ship as migrations (0048–0051) and take effect after `bun run db:migrate` on deploy.

---

## High

### H1. Unauthenticated, unthrottled GETs create DB rows and enqueue full upstream scrapes; one shared proxy budget (A12-01, A8-02, A8-11)

- **Category:** Security | **Files:** `player.controller.ts:73-88`, `scoresaber-player.service.ts:52-65`, `player-core.service.ts:160-177`, `scoresaber-leaderboards.service.ts:47-53,148-179`, `scores.controller.ts:48-68`, `scoresaber-api.service.ts:105-110`
- **Problem:** Every state-changing operation is reachable via unauthenticated GET: `GET /player/:id`, `/player/search`, `/ranking/:page` → `createPlayer` (inserts an account row and enqueues a multi-page `FetchMissingScoresQueue` job); `GET /leaderboard/by-id/:id`, `/scores/leaderboard/:id/:page`, `/scores/:scoreId`, `/player/score-history/...` → `createLeaderboard` (upstream fetch + insert + full `LeaderboardScoreSeedQueue` scrape); `/player/refresh/:id` fires an upstream refresh; live-scores GETs fire-and-forget `upsertScoresFromApi` DB upserts. There is no auth middleware, no rate limiting, and no per-IP throttle anywhere (`/metrics` is the only authed endpoint). All upstream traffic flows through one shared `PROXY_URL`; an attacker enumerating sequential leaderboard/player IDs can exhaust the ScoreSaber quota and starve the legitimate ingestion pipeline, while polluting the DB.
- **Evidence:** `scoresaber-leaderboards.service.ts:47-52` `getLeaderboard` → `createLeaderboard` on miss; `:168-173` seed-queue enqueue; `player-core.service.ts:163-177` refresh-queue enqueue on `trackedScores < totalSubmittedPlays`; `scoresaber-api.service.ts:105-110` single shared proxy fetch.
- **Fix:** Auth (Bearer/API key) or per-IP rate limits on state-changing routes; gate account/leaderboard auto-creation and queue enqueues; cap seed queue depth; don't enqueue background jobs from unauthenticated requests.

### H12. Deranked/removed maps never lose `ranked`/`qualified` status (A7-01)

- **Category:** Data Integrity | **Files:** `leaderboard-ranked-sync.service.ts:40-101`
- **Problem:** `refreshRankedLeaderboards()`/`refreshQualifiedLeaderboards()` only upsert leaderboards present in the current API lists; there is no sweep clearing `ranked=false`/`qualified=false` for maps SS has deranked/removed, and no other code path writes `ranked=false`. Deranked maps keep their stars/rankedDate forever — they keep appearing under `?ranked=true`, star filters, and leaderboard pages, so the ranked catalog drifts from ScoreSaber ground truth and never self-heals.
- **Fix:** After the upsert pass, compute the set difference between previously ranked/qualified DB rows and the API lists and batch-update them to false (null stars/rankedDate as appropriate).

### H13. Playlist endpoints materialize every score of a player per request — unbounded, uncached, unauthenticated (A8-01)

- **Category:** Performance | **Files:** `playlist.service.ts:482-517`, `scoresaber-scores.repository.ts:384-398`
- **Problem:** `/playlist/self` and `/playlist/snipe` run `selectScoresJoinedLeaderboardsWhere` with **no `.limit()`** — tens of thousands of rows for a top player, joined to leaderboards, an `inArray` of ~40k leaderboard ids, an in-memory sort, and a multi-MB playlist response; `/snipe` does this for two players concurrently. Unauthenticated, uncached, unthrottled.
- **Fix:** Cap scores per request (top-N by PP), cache generated playlists keyed by (user, settings), rate-limit.

### H15. SS API failures silently collapse to `undefined` — 429s become 404s and truncated syncs (A5-04, A7-06)

- **Category:** Error Handling | **Files:** `scoresaber-api.service.ts:111-138,503-506`, `scoresaber-leaderboard-scores.service.ts:32-34`
- **Problem:** `fetch` maps every failure (429, 15s abort, network, non-200, parse) to `undefined` with no logging of status and no retry. Callers can't distinguish "rate limited" from "not found": a transient SS 429 makes the leaderboard scores endpoint return HTTP 404; `getScoreSaberLivePlayerScores` returns an empty page; and `getAllLeaderboards` treats a failed page as end-of-data, silently truncating the ranked/qualified sync (which then reports "Updated X/Y" as if complete).
- **Fix:** Expose/throw typed errors for 429/5xx/timeout, retry with backoff honoring `Retry-After`, and have callers return 502/429 instead of 404/truncation.

### H16. No timeout on `ApiService`/`Request` fetches — BeatSaver calls and replay downloads can hang forever (A5-05)

- **Category:** Error Handling | **Files:** `common/src/utils/request.ts:92-98`, `beatleader.service.ts:83,298-300`
- **Problem:** `Request.executeRequest` passes no AbortController/signal (unlike `ScoreSaberApiService.fetch`, which has a 15s timeout). BeatSaver lookups on the HTTP hot path and the BeatLeader replay download (awaited inside `trackBeatLeaderScore` on the live websocket path) can stall indefinitely on a hung connection: no timeout, no size cap.
- **Fix:** Add an AbortController with a per-request timeout in `executeRequest`; propagate abort as a normal `undefined` result.

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
- **Problem:** Star changes are recorded and history reweighted per leaderboard _before_ the batched upsert; a crash/throw between them re-detects the same change next run → duplicate star-change rows. The cron has no try/catch.
- **Fix:** Record star changes after (or in the same transaction as) the upsert; make insertRow idempotent (key on leaderboardId + old/new stars).

### M12. `z.coerce.boolean()` maps `"false"` to `true`, inverting ranked/qualified/includeInactives filters (A7-04, A8-12)

- **Files:** `common/src/schemas/scoresaber/leaderboard/query-filters.ts:15-16`, `player-ranking.controller.ts:28`
- **Problem:** `Boolean("false")` is true in zod 4's coercion, so `?ranked=false` returns only ranked maps. The first-party website never sends `false` (ssr-api.ts only spreads truthy values), so this is a latent API-contract bug for third-party clients.
- **Fix:** `z.enum(["true","false"]).transform(v => v === "true")`.

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

### M32. BL score seeding tracks scores one-by-one and fires an API stats fetch per new score (A6-10)

- **Files:** `player-beatleader-scores.service.ts:119-132`, `beatleader.service.ts:112`
- **Problem:** Sequential awaited `trackBeatLeaderScore` per score (up to 100/page), plus a fire-and-forget external stats API call per new score — thousands of API requests for a player with many scores, all serialized.
- **Fix:** Chunk with a concurrency cap per page; rate-limit/batch `saveScoreStats`.

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

## Info / Positive findings

- **I1. BigInt audit of the HTTP layer is clean (A8-15):** ScoreSaber player IDs are strings end-to-end (17-18 digits never pass through `Number()`); the only `parseInt` (replay `scoreId`) is safe because BL score ids are int4.
- **I2. Account resolution design is sound (own verification):** `resolveAccountForBlPlayer` disambiguates multi-account players by play-time window and falls back to most-recently-active — the linked-ID attribution it serves was disabled by the (now fixed) C1/H7 issues.
- **I3. Queue metrics / events manager are correct (A10-13):** no division-by-zero, failure counting works, listener dedupe is sound.
- **I4. Dependencies are current (mid-2026); no obvious CVE candidates (A12-09):** minor hygiene: `dotenv` and `@dotenvx/dotenvx` both present (redundant).
- **I5. Public `/swagger` + relaxed security headers (hsts/CSP off) are deliberate but undocumented (A12-10).** HSTS recommended on the API host.
- **I6. `t3-env` validation is disabled (`skipValidation: true`, env.ts:125) — misconfigs surface only at runtime (A12-08);** an empty `PROMETHEUS_AUTH_TOKEN` in prod makes `/metrics` return 500 at scrape time instead of failing fast at boot.
- **I7. Dead cache config (A9-11):** `SCORESABER_PLAYER_EXISTS` and `SCORESABER_LEADERBOARD_STAR_CHANGE` CacheIds and `testRedisConnection` are never used — misleading to maintainers.

---

## Verification notes

- **Live API checks performed** (read-only): ScoreSaber `timeSet` format (`"2021-08-11T17:44:41.000Z"`), ScoreSaber score id magnitude (≤ ~92M), ScoreSaber `/v2/players/count` (`{"count":37598}`), BeatLeader `scoreImprovement` with `includeIO=false` (`null`) vs `includeIO=true` (object), BeatLeader score id magnitude (≤ ~33M).
- **Rejected finding (false positive):** one agent reported that SS `timeSet` is unix-seconds and `new Date(token.timeSet)` produces Invalid Dates (A5-01). This was **disproven** by the live API — `timeSet` is ISO-8601 and `new Date()` parses it correctly. The real bug is the _pairing_ code feeding ISO strings to `beatLeaderTimesetToMs` (C2). The related latent inconsistency (unconditional `timeset * 1000` in the BL insert path) is preserved as M9.
- **Severity adjustments:** A3-03's claim that fire-and-forget rejections "crash the whole backend" was downgraded to Medium — `registerGlobalErrorHandlers` intercepts `unhandledRejection` without exiting; the real impact is silent work loss + Discord noise (M1). A9-01's heap estimate was framed with the current scale (~242 replays).
- All findings were cross-checked by reading the cited code; the top-severity items (C1, C2, H2, H5, H14) were additionally reproduced/verified against live API responses or the actual query plans implied by schema indexes.

## Slice map (agent → prefix)
