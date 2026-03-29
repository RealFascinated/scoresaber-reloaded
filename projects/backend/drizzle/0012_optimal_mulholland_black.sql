CREATE TABLE "beatleader-scores" (
	"id" integer PRIMARY KEY NOT NULL,
	"playerId" varchar(32) NOT NULL,
	"songHash" varchar(64) NOT NULL,
	"leaderboardId" varchar(32) NOT NULL,
	"pauses" integer NOT NULL,
	"fcAccuracy" double precision NOT NULL,
	"fullCombo" boolean NOT NULL,
	"savedReplay" boolean NOT NULL,
	"leftHandAccuracy" double precision NOT NULL,
	"rightHandAccuracy" double precision NOT NULL,
	"misses" integer NOT NULL,
	"missedNotes" integer NOT NULL,
	"bombCuts" integer NOT NULL,
	"wallsHit" integer NOT NULL,
	"badCuts" integer NOT NULL,
	"improvementScore" integer NOT NULL,
	"improvementPauses" integer NOT NULL,
	"improvementMisses" integer NOT NULL,
	"improvementMissedNotes" integer NOT NULL,
	"improvementBombCuts" integer NOT NULL,
	"improvementWallsHit" integer NOT NULL,
	"improvementBadCuts" integer NOT NULL,
	"improvementLeftHandAccuracy" double precision NOT NULL,
	"improvementRightHandAccuracy" double precision NOT NULL,
	"timestamp" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scoresaber-medal-scores" RENAME COLUMN "scoreId" TO "id";--> statement-breakpoint
ALTER TABLE "scoresaber-scores" RENAME COLUMN "scoreId" TO "id";--> statement-breakpoint
DROP INDEX "medal_scores_leaderboard_score_idx";--> statement-breakpoint
CREATE INDEX "medal_scores_leaderboard_score_idx" ON "scoresaber-medal-scores" USING btree ("leaderboardId","score" DESC NULLS LAST,"id" DESC NULLS LAST);