-- Seeds historical reweights from the existing star-change history. Run by hand, never from code.
--
-- Prerequisites: migration 0065_reweights has been applied, and 01-preview-reweight-clusters.sql
-- gave groups that match the wiki (https://wiki.scoresaber.com/ranking/reweights).
--
-- It runs inside a transaction and ends WITHOUT committing. Check the verification output, then
-- type COMMIT; (or ROLLBACK;). Run dev first, then prod:
--   psql "$DATABASE_URL" -f 02-seed-reweights.sql
--
-- What it does NOT do:
--   * no pp data: playerCount / scoreCount stay 0 and the UI says pp changes were not tracked
--   * star changes keep ppPending = false, so the live sync never tries to capture their pp
--   * only rows without a reweight yet are touched, so it is safe to re-run after new live ones

BEGIN;

CREATE TEMP TABLE seed_changes ON COMMIT DROP AS
WITH ordered AS (
  SELECT
    id,
    "leaderboardId",
    "timestamp",
    CASE
      WHEN lag("timestamp") OVER w IS NULL
        OR "timestamp" - lag("timestamp") OVER w > interval '3 days'
      THEN 1 ELSE 0
    END AS starts_group
  FROM "scoresaber-reweight-leaderboards"
  WHERE "realmId" = 1 AND "reweightId" IS NULL
  WINDOW w AS (ORDER BY "timestamp", id)
)
SELECT id, "leaderboardId", "timestamp", sum(starts_group) OVER (ORDER BY "timestamp", id) AS grp
FROM ordered;

CREATE TEMP TABLE seed_groups ON COMMIT DROP AS
SELECT
  grp,
  min("timestamp") AS started_at,
  max("timestamp") AS ended_at,
  count(DISTINCT "leaderboardId") AS leaderboards
FROM seed_changes
GROUP BY grp;

-- Optional: drop groups that are not real reweights (e.g. a lone correction) before inserting.
-- DELETE FROM seed_groups WHERE grp IN (...);

INSERT INTO "scoresaber-reweights" ("realmId", "startedAt", "endedAt", "leaderboardCount")
SELECT 1, started_at, ended_at, leaderboards
FROM seed_groups
ORDER BY grp;

-- Link the star changes to their reweight. The start time identifies the group.
UPDATE "scoresaber-reweight-leaderboards" sc
SET "reweightId" = r.id
FROM seed_changes c
JOIN seed_groups g ON g.grp = c.grp
JOIN "scoresaber-reweights" r ON r."realmId" = 1 AND r."startedAt" = g.started_at
WHERE sc.id = c.id;

-- Names default to "<Month> <Year> Reweight". The wiki calls these two "Global Reweight"s:
-- UPDATE "scoresaber-reweights" SET name = 'May 2023 Global Reweight'
--   WHERE "realmId" = 1 AND "startedAt" >= '2023-05-19' AND "startedAt" < '2023-05-27';
-- UPDATE "scoresaber-reweights" SET name = 'August 2024 Global Reweight'
--   WHERE "realmId" = 1 AND "startedAt" >= '2024-07-31' AND "startedAt" < '2024-08-08';

-- Verification: every seeded reweight with its dates and map count.
SELECT r.id, r.name, r."startedAt", r."endedAt", r."leaderboardCount",
       (SELECT count(*) FROM "scoresaber-reweight-leaderboards" sc WHERE sc."reweightId" = r.id) AS star_changes
FROM "scoresaber-reweights" r
WHERE r."realmId" = 1
ORDER BY r."startedAt";

-- Must be 0: star changes of the default realm that are still without a reweight.
SELECT count(*) AS unlinked
FROM "scoresaber-reweight-leaderboards"
WHERE "realmId" = 1 AND "reweightId" IS NULL;

-- COMMIT;
-- ROLLBACK;
