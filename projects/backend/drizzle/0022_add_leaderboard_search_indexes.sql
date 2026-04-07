CREATE INDEX "leaderboards_ranked_date_desc_idx" ON "scoresaber-leaderboards" USING btree ("rankedDate" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "leaderboards_plays_desc_idx" ON "scoresaber-leaderboards" USING btree ("plays" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "leaderboards_author_idx" ON "scoresaber-leaderboards" USING btree ("levelAuthorName");