CREATE TABLE "scoresaber-medal-scores" (
	"scoreId" integer PRIMARY KEY NOT NULL,
	"playerId" varchar(32) NOT NULL,
	"leaderboardId" integer NOT NULL,
	"difficulty" varchar(32) NOT NULL,
	"characteristic" varchar(32) NOT NULL,
	"score" integer NOT NULL,
	"accuracy" double precision NOT NULL,
	"medals" integer NOT NULL,
	"missedNotes" integer NOT NULL,
	"badCuts" integer NOT NULL,
	"maxCombo" integer NOT NULL,
	"fullCombo" boolean NOT NULL,
	"modifiers" varchar(32)[],
	"hmd" varchar(32),
	"rightController" varchar(32),
	"leftController" varchar(32),
	"timestamp" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scoresaber-score-history" ALTER COLUMN "scoreId" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "scoresaber-scores" ALTER COLUMN "scoreId" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "scoresaber-scores" ALTER COLUMN "difficulty" SET DATA TYPE varchar(64);--> statement-breakpoint
ALTER TABLE "scoresaber-scores" ALTER COLUMN "characteristic" SET DATA TYPE varchar(64);--> statement-breakpoint
ALTER TABLE "scoresaber-scores" DROP COLUMN "beatLeaderScoreId";