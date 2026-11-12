-- READ ONLY. Proposes reweights from the existing star-change history.
--
-- Star changes are grouped the same way the live sync groups them: a change belongs to the
-- same reweight as the previous one unless more than 3 days passed since it (rolling window).
-- Compare the result with https://wiki.scoresaber.com/ranking/reweights before seeding:
--   * the wiki lists one reweight per month; our timestamps are when the sync *noticed* the
--     change, so they can be a day or two after the wiki date
--   * two real reweights closer than 3 days would be merged into one group here
--   * a reweight whose maps were noticed over more than 3 days with a gap would be split
--
-- Run against dev first:  psql "$DATABASE_URL" -f 01-preview-reweight-clusters.sql

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
),
grouped AS (
  SELECT *, sum(starts_group) OVER (ORDER BY "timestamp", id) AS grp FROM ordered
)
SELECT
  grp,
  min("timestamp") AS started_at,
  max("timestamp") AS ended_at,
  count(*) AS star_changes,
  count(DISTINCT "leaderboardId") AS leaderboards
FROM grouped
GROUP BY grp
ORDER BY grp;
