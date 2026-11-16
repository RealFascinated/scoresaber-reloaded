CREATE TABLE "scoresaber-leaderboard-suggested-maps" (
	"leaderboardId" integer NOT NULL,
	"realmId" integer NOT NULL,
	"ease" double precision NOT NULL,
	"prior" double precision NOT NULL,
	"scoreCount" integer NOT NULL,
	"weightScale" double precision NOT NULL,
	"updatedAt" timestamp NOT NULL,
	CONSTRAINT "scoresaber-leaderboard-suggested-maps_leaderboardId_realmId_pk" PRIMARY KEY("leaderboardId","realmId")
);
