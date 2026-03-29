CREATE INDEX "leaderboard_star_change_leaderboard_time_idx" ON "scoresaber-leaderboard-star-change" USING btree ("leaderboardId","timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "leaderboards_song_lookup_idx" ON "scoresaber-leaderboards" USING btree (lower("songHash"),"difficulty","characteristic");--> statement-breakpoint
CREATE INDEX "medal_scores_leaderboard_score_idx" ON "scoresaber-medal-scores" USING btree ("leaderboardId","score" DESC NULLS LAST,"scoreId" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "scoresaber_score_history_leaderboard_idx" ON "scoresaber-score-history" USING btree ("leaderboardId");--> statement-breakpoint
CREATE INDEX "scoresaber_score_history_player_leaderboard_time_idx" ON "scoresaber-score-history" USING btree ("playerId","leaderboardId","timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "scores_player_leaderboard_idx" ON "scoresaber-scores" USING btree ("playerId","leaderboardId");--> statement-breakpoint
CREATE INDEX "scores_leaderboard_id_idx" ON "scoresaber-scores" USING btree ("leaderboardId");--> statement-breakpoint
CREATE INDEX "scores_pp_positive_idx" ON "scoresaber-scores" USING btree ("pp" DESC NULLS LAST) WHERE "scoresaber-scores"."pp" > 0;