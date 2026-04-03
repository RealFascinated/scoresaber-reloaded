-- Requires CREATE privilege on the database (or pre-installed extension on managed Postgres).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE INDEX "accounts_name_trgm_idx" ON "scoresaber-accounts" USING gin ("name" gin_trgm_ops);
--> statement-breakpoint
DROP INDEX IF EXISTS "accounts_name_idx";
--> statement-breakpoint
CREATE INDEX "beatleader_scores_player_map_leaderboard_time_idx" ON "beatleader-scores" ("playerId", "songHash", "leaderboardId", "timestamp" DESC NULLS LAST);
