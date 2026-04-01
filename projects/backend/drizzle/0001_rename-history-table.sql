ALTER TABLE "player-history" RENAME TO "scoresaber-player-history";--> statement-breakpoint
DROP INDEX "player_history_player_id_date_unique";--> statement-breakpoint
DROP INDEX "player_history_player_id_date_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "scoresaber_player_history_player_id_date_unique" ON "scoresaber-player-history" USING btree ("playerId","date");--> statement-breakpoint
CREATE INDEX "scoresaber_player_history_player_id_date_idx" ON "scoresaber-player-history" USING btree ("playerId","date" DESC NULLS LAST);