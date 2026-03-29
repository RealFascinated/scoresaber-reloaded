CREATE TABLE "scoresaber-leaderboard-star-change" (
	"id" serial PRIMARY KEY NOT NULL,
	"leaderboardId" integer NOT NULL,
	"previousStars" double precision NOT NULL,
	"newStars" double precision NOT NULL,
	"timestamp" timestamp NOT NULL
);
--> statement-breakpoint
CREATE INDEX "leaderboard_star_change_leaderboard_idx" ON "scoresaber-leaderboard-star-change" ("leaderboardId");
