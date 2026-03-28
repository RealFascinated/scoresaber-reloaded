ALTER TABLE "scoresaber-leaderboards" ALTER COLUMN "id" SET DATA TYPE integer;--> statement-breakpoint
CREATE INDEX "leaderboards_search_idx" ON "scoresaber-leaderboards" USING gin (to_tsvector('english', "songName" || ' ' || "songSubName" || ' ' || "songAuthorName" || ' ' || "levelAuthorName"));--> statement-breakpoint
ALTER TABLE "scoresaber-leaderboards" DROP COLUMN "rawDifficulty";