DROP INDEX "beatleader_scores_player_map_leaderboard_time_idx";--> statement-breakpoint
CREATE INDEX "leaderboards_ranked_true_idx" ON "scoresaber-leaderboards" USING btree ("ranked") WHERE "scoresaber-leaderboards"."ranked" = true;--> statement-breakpoint
CREATE INDEX "leaderboards_qualified_true_idx" ON "scoresaber-leaderboards" USING btree ("qualified") WHERE "scoresaber-leaderboards"."qualified" = true;--> statement-breakpoint
CREATE INDEX "leaderboards_stars_not_null_idx" ON "scoresaber-leaderboards" USING btree ("stars") WHERE "scoresaber-leaderboards"."stars" is not null;--> statement-breakpoint
CREATE INDEX "beatleader_scores_player_map_leaderboard_time_idx" ON "beatleader-scores" USING btree ("playerId","songHash","leaderboardId","timestamp" DESC NULLS LAST);