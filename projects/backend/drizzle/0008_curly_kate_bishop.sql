CREATE TABLE "scoresaber-leaderboard-star-change" (
	"id" serial PRIMARY KEY NOT NULL,
	"leaderboardId" integer NOT NULL,
	"previousStars" double precision NOT NULL,
	"newStars" double precision NOT NULL,
	"timestamp" timestamp NOT NULL
);
