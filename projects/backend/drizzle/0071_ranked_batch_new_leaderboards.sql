CREATE TABLE "scoresaber-ranked-batch-new-leaderboards" (
	"rankedBatchId" integer NOT NULL,
	"leaderboardId" integer NOT NULL,
	"stars" double precision NOT NULL,
	"timestamp" timestamp NOT NULL,
	CONSTRAINT "scoresaber-ranked-batch-new-leaderboards_rankedBatchId_leaderboardId_pk" PRIMARY KEY("rankedBatchId","leaderboardId")
);
--> statement-breakpoint
ALTER TABLE "scoresaber-ranked-batches" ADD COLUMN "newLeaderboardCount" integer DEFAULT 0 NOT NULL;