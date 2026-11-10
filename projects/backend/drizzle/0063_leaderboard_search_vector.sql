DROP INDEX "leaderboards_search_idx";--> statement-breakpoint
ALTER TABLE "scoresaber-leaderboards" ADD COLUMN "searchVector" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', "songName" || ' ' || "songSubName" || ' ' || "songAuthorName" || ' ' || "levelAuthorName")) STORED;--> statement-breakpoint
CREATE INDEX "leaderboards_search_idx" ON "scoresaber-leaderboards" USING gin ("searchVector");