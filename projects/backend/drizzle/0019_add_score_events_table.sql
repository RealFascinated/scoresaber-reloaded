CREATE TABLE IF NOT EXISTS "scoresaber-score-events" (
	"id" serial PRIMARY KEY NOT NULL,
	"playerId" varchar(32) NOT NULL,
	"leaderboardId" integer NOT NULL,
	"timestamp" timestamp NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "score_events_leaderboard_timestamp_idx" ON "scoresaber-score-events" USING btree ("leaderboardId","timestamp");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "score_events_timestamp_idx" ON "scoresaber-score-events" USING btree ("timestamp");