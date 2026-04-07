CREATE TABLE "scoresaber-score-events" (
	"id" serial PRIMARY KEY NOT NULL,
	"playerId" varchar(32) NOT NULL,
	"leaderboardId" integer NOT NULL,
	"timestamp" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scoresaber-medal-scores" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "scoresaber-medal-scores" CASCADE;--> statement-breakpoint
DROP INDEX "beatsaver_maps_created_at_idx";--> statement-breakpoint
DROP INDEX "beatsaver_maps_tags_idx";--> statement-breakpoint
ALTER TABLE "scoresaber-accounts" ALTER COLUMN "avatar" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "scoresaber-accounts" ADD COLUMN "medalsRank" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "scoresaber-accounts" ADD COLUMN "medalsCountryRank" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "scoresaber-score-history" ADD COLUMN "medals" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "scoresaber-scores" ADD COLUMN "medals" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "score_events_leaderboard_timestamp_idx" ON "scoresaber-score-events" USING btree ("leaderboardId","timestamp");--> statement-breakpoint
CREATE INDEX "score_events_timestamp_idx" ON "scoresaber-score-events" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "scores_leaderboard_score_scoreid_desc_idx" ON "scoresaber-scores" USING btree ("leaderboardId","score" DESC NULLS LAST,"scoreId" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "scores_leaderboard_medals_nonzero_idx" ON "scoresaber-scores" USING btree ("leaderboardId") WHERE "scoresaber-scores"."medals" <> 0;--> statement-breakpoint
CREATE INDEX "scores_player_medals_positive_idx" ON "scoresaber-scores" USING btree ("playerId") WHERE "scoresaber-scores"."medals" > 0;