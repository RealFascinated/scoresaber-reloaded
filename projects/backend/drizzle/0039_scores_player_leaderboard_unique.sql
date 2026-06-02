CREATE UNIQUE INDEX IF NOT EXISTS "scores_player_leaderboard_unique" ON "scoresaber-scores" USING btree ("playerId", "leaderboardId");
--> statement-breakpoint
DROP INDEX IF EXISTS "scores_player_leaderboard_idx";
