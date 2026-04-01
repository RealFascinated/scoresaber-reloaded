DO $migrate$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'scoresaber-medal-scores'
      AND column_name = 'id'
  ) THEN
    ALTER TABLE "scoresaber-medal-scores" RENAME COLUMN "id" TO "scoreId";
  END IF;
END $migrate$;--> statement-breakpoint
DROP INDEX IF EXISTS "medal_scores_leaderboard_score_idx";--> statement-breakpoint
CREATE INDEX "medal_scores_leaderboard_score_idx" ON "scoresaber-medal-scores" USING btree ("leaderboardId","score" DESC NULLS LAST,"scoreId" DESC NULLS LAST);