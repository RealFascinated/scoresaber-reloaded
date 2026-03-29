CREATE TABLE "scoresaber-players" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"country" varchar(32),
	"peakRank" integer,
	"peakRankTimestamp" timestamp,
	"seededScores" boolean NOT NULL,
	"seededBeatLeaderScores" boolean NOT NULL,
	"trackReplays" boolean NOT NULL,
	"inactive" boolean NOT NULL,
	"banned" boolean NOT NULL,
	"hmd" varchar(32),
	"pp" double precision DEFAULT 0 NOT NULL,
	"medals" integer DEFAULT 0 NOT NULL,
	"scoreStats" jsonb NOT NULL
);
--> statement-breakpoint
CREATE INDEX "players_name_idx" ON "scoresaber-players" USING btree ("name");