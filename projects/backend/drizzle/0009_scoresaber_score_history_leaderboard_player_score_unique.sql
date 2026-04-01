CREATE UNIQUE INDEX "scoresaber_score_history_leaderboard_player_score_unique" ON "scoresaber-score-history" USING btree ("leaderboardId","playerId","score");--> statement-breakpoint
