# Reweights

Track every ScoreSaber reweight as a first-class event: which maps were re-rated, by how much, and (going forward) how much pp every affected player and score gained or lost.

## Status

| Area                                                                      | State                                                    |
| ------------------------------------------------------------------------- | -------------------------------------------------------- |
| Schema + migration `0065_reweights`                                       | done                                                     |
| Shared schemas + `ssrApi` methods (`@ssr/common`)                         | done                                                     |
| Reweight grouping/merge, pp capture, API                                  | done, covered by tests                                   |
| Ranked sync cleanup                                                       | done                                                     |
| Discord ping links the reweight, no re-ping on merges                     | done                                                     |
| Manual seed SQL (`plans/seed/`)                                           | written, tested on a scratch DB, **not run on dev/prod** |
| Website (list, detail, leaderboard links, profile section, chart markers) | built, lint/build pass, **not checked in a browser**     |

## How it works

### Data model (`projects/backend/src/db/schema.ts`)

- `scoresaber-reweights`: `id, realmId, name?, startedAt, endedAt, leaderboardCount, playerCount, scoreCount, notifiedAt?`. The display name is `name` or "`<Month> <Year> Reweight`" (UTC).
- `scoresaber-reweight-leaderboards` gained `reweightId` (nullable, indexed) and `ppPending` (default false). `ppPending = true` means the pp changes of that star change still have to be captured. **Seeded rows keep `false`**, so the live sync never touches them.
- `scoresaber-reweight-players`: `(reweightId, playerId)` pk, `ppBefore, ppAfter, ppDelta, scoresChanged`.
- `scoresaber-reweight-scores`: `(reweightId, scoreId)` pk, `playerId, leaderboardId, ppBefore, ppAfter`. Only scores whose pp changed are stored.

Reweights are default-realm only. Other realms keep recording star changes without a `reweightId`.

### Live flow (`ReweightService`, called from `LeaderboardRankedSyncService`)

1. `diffRankedLeaderboards` (pure) compares stored and reported leaderboards.
2. `recordStarChanges` attaches the star changes to the latest reweight that ended within 3 days of the first new change (rolling window), otherwise creates one. This runs **before** the leaderboards are upserted: once the new stars are stored the change can no longer be detected, so recording after would risk losing it.
3. `processPendingPpChanges` handles every `ppPending` star change, which also retries earlier failures. Per leaderboard it pages ScoreSaber's realm scores (the same endpoint `RealmScoreSyncService` uses):
   - **pp before** = the pp stored in `scoresaber-score-realms`
   - **pp after** = the pp ScoreSaber reports
   - Nothing is recomputed from the curve. Each page records its changes _before_ overwriting the stored pp, and a repeat never overwrites `ppBefore`, so a crash mid-way is safe to retry.
   - A leaderboard is only marked captured when every page was read; a failed fetch leaves it pending.
4. Player totals are the weighted sums (`WEIGHT_COEFFICIENT`) of the player's unchanged ranked pp plus the changed scores' before/after values. They are recalculated for every player with a changed score on the processed leaderboards, so late-merged maps update the totals without losing earlier ones.
5. Player caches are invalidated and the markers cache dropped.

This also fixes an existing gap: the default realm's stored pp was never refreshed after a star change (only archived history pp was).

### Notifications

`handleRankedBatch` receives the sync result. The batch message always links `${NEXT_PUBLIC_WEBSITE_URL}/reweights/{id}`. `notifiedAt` is set after the first announcement; later merges into that reweight post the changelog **without** the role ping (unless the batch also ranked new maps).

### API (`reweight.controller.ts`)

- `GET /reweights?page=` paginated list (12/page), newest first
- `GET /reweights/markers` `{id, name, date}[]` for chart annotations (cached 1h)
- `GET /reweights/:reweightId` reweight + one entry per re-rated leaderboard (first previous to last new stars)
- `GET /reweights/:reweightId/players?page=&direction=gain|loss` visible (not banned/inactive) players
- `GET /reweights/player/:playerId` reweights that changed a player's pp
- `GET /reweights/player/:playerId/:reweightId/scores?page=` the changed scores

The controller is registered outside the main Elysia chain in `index.ts`: the chain is at the compiler's type-instantiation depth limit.

## Seeding historical reweights (manual, never from code)

Files in `plans/seed/`:

1. `01-preview-reweight-clusters.sql`: read-only proposal, clusters existing star changes with the same rolling 3-day rule.
2. `02-seed-reweights.sql`: runs in a transaction and ends without committing. Inserts the reweights, links the star changes (`ppPending` stays false), and shows a verification report. Run on dev first, then prod, then `COMMIT`.

The wiki (https://wiki.scoresaber.com/ranking/reweights) lists one "Monthly Reweight" per month (latest 11 October 2026), plus "Global Reweight"s on 21 May 2023 and 2 August 2024. Our timestamps are when the sync noticed a change, so expect them to land a day or two after the wiki date. Compare the preview with the wiki list, drop groups that are not real reweights, and use the commented `UPDATE`s for the global reweight names. Months where we have no star-change rows would need a manual header-only insert. The wiki's per-reweight sub-pages were not read.

3. `03-example-reweight.sql`: **dev only**. Builds one "Example Reweight (dev)" from real leaderboards, scores and players (3 maps, up to 150 scores each, pp after approximated by scaling with the star change) so the UI has data to show. Same transaction rules; the header explains how to remove it.

Seeded reweights have `playerCount = scoreCount = 0`; the UI shows "pp changes were not tracked".

## Decisions made

- Merge window: 3 days, rolling from the last change (`REWEIGHT_MERGE_WINDOW_MS`).
- Default realm only.
- Star changes only (including unranks, as a change to 0 stars). Newly ranked maps and curve-only reweights do not create reweights.
- The pp capture runs inline after the sync, not through the queue; it is idempotent and retried by the next sync.

## Known gaps and follow-ups

- **Unranking is detected** by comparing stored ranked leaderboards with the API's list (`findUnrankedLeaderboards`). It is refused when the list is incomplete (`getAllLeaderboards` reports `complete`), empty, or would unrank more than 50 maps at once. An unranked map is recorded as a star change to 0 stars ("Unranked" in the UI) and its stored pp is cleared without asking the API. Remaining gaps: medals on unranked maps are not cleared, and unranks are not verified per map against the API.
- **Curve-only reweights** shift every score without a star change; they would need their own trigger (compare the realm curve between syncs).
- **Rank change per player** is not captured (a true global rank before/after cannot be computed cheaply at reweight time).
- **Coverage**: deltas only cover scores we store; the UI should say so.
- **Not atomic**: `recordStarChanges` creates the reweight and inserts the star changes in separate statements; a crash between them leaves an empty reweight (the next sync re-detects the change and merges into it).
- **Size** of `scoresaber-reweight-scores` should be watched after the first real reweight.
