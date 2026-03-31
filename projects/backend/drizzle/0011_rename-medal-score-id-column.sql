ALTER TABLE "scoresaber-medal-scores" RENAME COLUMN "id" TO "scoreId";--> statement-breakpoint
DROP INDEX "medal_scores_leaderboard_score_idx";--> statement-breakpoint
CREATE INDEX "medal_scores_leaderboard_score_idx" ON "scoresaber-medal-scores" USING btree ("leaderboardId","score" DESC NULLS LAST,"scoreId" DESC NULLS LAST);