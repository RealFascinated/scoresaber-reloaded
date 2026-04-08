CREATE MATERIALIZED VIEW IF NOT EXISTS "ssr_table_counts" AS
SELECT
  1::int AS "id",
  (SELECT COUNT(*)::bigint FROM "scoresaber-scores") AS "scoresaberScores",
  (SELECT COUNT(*)::bigint FROM "scoresaber-score-history") AS "scoresaberScoreHistory",
  (SELECT COUNT(*)::bigint FROM "scoresaber-accounts") AS "scoresaberAccounts",
  (SELECT COUNT(*)::bigint FROM "scoresaber-leaderboards") AS "scoresaberLeaderboards",
  now() AS "refreshedAt";

CREATE UNIQUE INDEX IF NOT EXISTS "ssr_table_counts_id_unique" ON "ssr_table_counts" ("id");
