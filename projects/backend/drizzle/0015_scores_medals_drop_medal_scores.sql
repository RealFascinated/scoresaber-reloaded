ALTER TABLE "scoresaber-scores" ADD COLUMN "medals" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "scoresaber-score-history" ADD COLUMN "medals" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "scores_leaderboard_score_scoreid_desc_idx" ON "scoresaber-scores" USING btree ("leaderboardId","score" DESC NULLS LAST,"scoreId" DESC NULLS LAST);--> statement-breakpoint
DROP INDEX IF EXISTS "medal_scores_leaderboard_score_idx";--> statement-breakpoint
DROP TABLE IF EXISTS "scoresaber-medal-scores";
