CREATE INDEX "accounts_active_hmd_idx" ON "scoresaber-accounts" USING btree ("hmd") WHERE "scoresaber-accounts"."inactive" = false;--> statement-breakpoint
CREATE INDEX "accounts_joined_date_idx" ON "scoresaber-accounts" USING btree ("joinedDate");--> statement-breakpoint
CREATE INDEX "accounts_seeded_bl_false_idx" ON "scoresaber-accounts" USING btree ("id") WHERE "scoresaber-accounts"."seededBeatLeaderScores" = false;--> statement-breakpoint
CREATE INDEX "accounts_seeded_scores_false_idx" ON "scoresaber-accounts" USING btree ("id") WHERE "scoresaber-accounts"."seededScores" = false;