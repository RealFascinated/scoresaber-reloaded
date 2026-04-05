-- Speeds up global medal sync: GROUP BY "playerId" FROM scores WHERE medals > 0
CREATE INDEX IF NOT EXISTS "scores_player_medals_positive_idx" ON "scoresaber-scores" ("playerId") WHERE medals > 0;
