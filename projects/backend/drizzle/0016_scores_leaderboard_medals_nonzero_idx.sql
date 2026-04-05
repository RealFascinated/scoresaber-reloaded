-- Speeds up medal recompute: find rows with medals on a leaderboard without scanning all plays on that map.
CREATE INDEX IF NOT EXISTS "scores_leaderboard_medals_nonzero_idx" ON "scoresaber-scores" ("leaderboardId") WHERE medals <> 0;--> statement-breakpoint
