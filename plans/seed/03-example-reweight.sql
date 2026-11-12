-- DEV ONLY. Creates one example reweight from real data so the reweights UI has something to show.
-- Run by hand, never from code, and never on prod:
--   psql "$DATABASE_URL" -f 03-example-reweight.sql
--
-- Prerequisite: migration 0065_reweights has been applied.
--
-- It runs in a transaction and ends WITHOUT committing. Check the verification output, then type
-- COMMIT; (or ROLLBACK;).
--
-- What it does:
--   * picks the 3 ranked default-realm leaderboards with the most pp scores
--   * records a star change on each (+12%, -12%, +6%), tagged with the new reweight
--   * for up to 150 pp scores per leaderboard, records pp before (the stored pp) and pp after
--     (the stored pp scaled by the star change, an approximation: this is example data only)
--   * computes each affected player's weighted total before and after (coefficient 0.965)
--
-- What it does NOT do:
--   * it does not change real leaderboard stars or the stored score pp, so profiles keep their
--     real pp and the star history of those maps shows a change the map never really had
--
-- Remove it again (needs the id printed below, or the name):
--   DELETE FROM "scoresaber-reweight-scores"      WHERE "reweightId" = <id>;
--   DELETE FROM "scoresaber-reweight-players"     WHERE "reweightId" = <id>;
--   DELETE FROM "scoresaber-reweight-leaderboards" WHERE "reweightId" = <id>;
--   DELETE FROM "scoresaber-reweights"            WHERE id = <id>;
-- After inserting or removing it, restart the backend or wait up to 1h: the chart markers
-- and the leaderboard star history are cached.

BEGIN;

-- Refuse to create it twice.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "scoresaber-reweights" WHERE name = 'Example Reweight (dev)') THEN
    RAISE EXCEPTION 'The example reweight already exists, remove it first (see the header)';
  END IF;
END $$;

CREATE TEMP TABLE example_maps ON COMMIT DROP AS
SELECT
  picked."leaderboardId",
  lr.stars AS previous_stars,
  round((lr.stars * (ARRAY[1.12, 0.88, 1.06])[picked.n])::numeric, 2)::double precision AS new_stars
FROM (
  SELECT sr."leaderboardId", row_number() OVER (ORDER BY count(*) DESC, sr."leaderboardId") AS n
  FROM "scoresaber-score-realms" sr
  JOIN "scoresaber-leaderboard-realms" lr
    ON lr."leaderboardId" = sr."leaderboardId" AND lr."realmId" = sr."realmId"
  WHERE sr."realmId" = 1 AND sr.pp > 0 AND lr.ranked AND lr.stars > 0
  GROUP BY sr."leaderboardId"
  ORDER BY count(*) DESC, sr."leaderboardId"
  LIMIT 3
) picked
JOIN "scoresaber-leaderboard-realms" lr ON lr."leaderboardId" = picked."leaderboardId" AND lr."realmId" = 1;

DO $$
BEGIN
  IF (SELECT count(*) FROM example_maps) = 0 THEN
    RAISE EXCEPTION 'No ranked leaderboards with pp scores found in this database';
  END IF;
END $$;

CREATE TEMP TABLE example_reweight ON COMMIT DROP AS
WITH inserted AS (
  INSERT INTO "scoresaber-reweights" ("realmId", name, "startedAt", "endedAt", "leaderboardCount", "notifiedAt")
  SELECT 1, 'Example Reweight (dev)', now() - interval '1 day', now(), count(*), now()
  FROM example_maps
  RETURNING id
)
SELECT id FROM inserted;

INSERT INTO "scoresaber-reweight-leaderboards"
  ("leaderboardId", "realmId", "previousStars", "newStars", "timestamp", "reweightId", "ppPending")
SELECT "leaderboardId", 1, previous_stars, new_stars, now() - interval '12 hours', (SELECT id FROM example_reweight), false
FROM example_maps;

-- Changed scores: the 150 highest pp scores of each map.
INSERT INTO "scoresaber-reweight-scores" ("reweightId", "scoreId", "playerId", "leaderboardId", "ppBefore", "ppAfter")
SELECT (SELECT id FROM example_reweight), ranked."scoreId", ranked."playerId", ranked."leaderboardId",
       ranked.pp, ranked.pp * m.new_stars / m.previous_stars
FROM (
  SELECT sr.*, row_number() OVER (PARTITION BY sr."leaderboardId" ORDER BY sr.pp DESC, sr."scoreId") AS rn
  FROM "scoresaber-score-realms" sr
  WHERE sr."realmId" = 1 AND sr.pp > 0 AND sr."leaderboardId" IN (SELECT "leaderboardId" FROM example_maps)
) ranked
JOIN example_maps m ON m."leaderboardId" = ranked."leaderboardId"
WHERE ranked.rn <= 150;

-- Player totals: the weighted sum of all of a player's pp scores, before and after the changed ones.
INSERT INTO "scoresaber-reweight-players" ("reweightId", "playerId", "ppBefore", "ppAfter", "ppDelta", "scoresChanged")
WITH affected AS (
  SELECT "playerId", count(*) AS scores_changed
  FROM "scoresaber-reweight-scores"
  WHERE "reweightId" = (SELECT id FROM example_reweight)
  GROUP BY "playerId"
),
player_scores AS (
  SELECT sr."playerId", sr.pp AS pp_before, coalesce(rs."ppAfter", sr.pp) AS pp_after
  FROM "scoresaber-score-realms" sr
  JOIN affected a ON a."playerId" = sr."playerId"
  LEFT JOIN "scoresaber-reweight-scores" rs
    ON rs."reweightId" = (SELECT id FROM example_reweight) AND rs."scoreId" = sr."scoreId"
  WHERE sr."realmId" = 1 AND sr.pp > 0
),
weighted AS (
  SELECT
    "playerId",
    sum(pp_before * power(0.965, rn_before - 1)) AS pp_before,
    sum(pp_after * power(0.965, rn_after - 1)) AS pp_after
  FROM (
    SELECT "playerId", pp_before, pp_after,
           row_number() OVER (PARTITION BY "playerId" ORDER BY pp_before DESC) AS rn_before,
           row_number() OVER (PARTITION BY "playerId" ORDER BY pp_after DESC) AS rn_after
    FROM player_scores
  ) ordered
  GROUP BY "playerId"
)
SELECT (SELECT id FROM example_reweight), w."playerId", w.pp_before, w.pp_after, w.pp_after - w.pp_before, a.scores_changed
FROM weighted w
JOIN affected a ON a."playerId" = w."playerId";

UPDATE "scoresaber-reweights" r
SET "playerCount" = (SELECT count(*) FROM "scoresaber-reweight-players" WHERE "reweightId" = r.id),
    "scoreCount" = (SELECT count(*) FROM "scoresaber-reweight-scores" WHERE "reweightId" = r.id)
WHERE r.id = (SELECT id FROM example_reweight);

-- Verification.
SELECT r.id, r.name, r."leaderboardCount", r."playerCount", r."scoreCount"
FROM "scoresaber-reweights" r WHERE r.id = (SELECT id FROM example_reweight);

SELECT m."leaderboardId", m.previous_stars, m.new_stars FROM example_maps m ORDER BY m."leaderboardId";

SELECT count(*) FILTER (WHERE "ppDelta" > 0) AS gainers,
       count(*) FILTER (WHERE "ppDelta" < 0) AS losers,
       round(min("ppDelta")::numeric, 2) AS biggest_loss,
       round(max("ppDelta")::numeric, 2) AS biggest_gain
FROM "scoresaber-reweight-players" WHERE "reweightId" = (SELECT id FROM example_reweight);

-- COMMIT;
-- ROLLBACK;
