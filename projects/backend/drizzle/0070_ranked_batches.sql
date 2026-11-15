ALTER TABLE "scoresaber-reweights" RENAME TO "scoresaber-ranked-batches";--> statement-breakpoint
ALTER TABLE "scoresaber-reweight-leaderboards" RENAME TO "scoresaber-ranked-batch-leaderboards";--> statement-breakpoint
ALTER TABLE "scoresaber-reweight-players" RENAME TO "scoresaber-ranked-batch-players";--> statement-breakpoint
ALTER TABLE "scoresaber-reweight-scores" RENAME TO "scoresaber-ranked-batch-scores";--> statement-breakpoint
ALTER TABLE "scoresaber-ranked-batch-leaderboards" RENAME COLUMN "reweightId" TO "rankedBatchId";--> statement-breakpoint
ALTER TABLE "scoresaber-ranked-batch-players" RENAME COLUMN "reweightId" TO "rankedBatchId";--> statement-breakpoint
ALTER TABLE "scoresaber-ranked-batch-scores" RENAME COLUMN "reweightId" TO "rankedBatchId";--> statement-breakpoint
ALTER TABLE "scoresaber-ranked-batch-players" RENAME CONSTRAINT "scoresaber-reweight-players_reweightId_playerId_pk" TO "scoresaber-ranked-batch-players_rankedBatchId_playerId_pk";--> statement-breakpoint
ALTER TABLE "scoresaber-ranked-batch-scores" RENAME CONSTRAINT "scoresaber-reweight-scores_reweightId_scoreId_pk" TO "scoresaber-ranked-batch-scores_rankedBatchId_scoreId_pk";--> statement-breakpoint
ALTER INDEX "reweight_players_player_idx" RENAME TO "ranked_batch_players_player_idx";--> statement-breakpoint
ALTER INDEX "reweight_players_delta_idx" RENAME TO "ranked_batch_players_delta_idx";--> statement-breakpoint
ALTER INDEX "reweight_scores_player_idx" RENAME TO "ranked_batch_scores_player_idx";--> statement-breakpoint
ALTER INDEX "reweight_scores_leaderboard_idx" RENAME TO "ranked_batch_scores_leaderboard_idx";--> statement-breakpoint
ALTER INDEX "reweights_realm_started_idx" RENAME TO "ranked_batches_realm_started_idx";--> statement-breakpoint
ALTER INDEX "leaderboard_star_change_reweight_idx" RENAME TO "leaderboard_star_change_ranked_batch_idx";
