CREATE TABLE "player-history" (
	"id" serial PRIMARY KEY NOT NULL,
	"playerId" varchar(32) NOT NULL,
	"date" timestamp NOT NULL,
	"rank" integer,
	"countryRank" integer,
	"pp" double precision,
	"plusOnePp" double precision,
	"totalScore" double precision,
	"totalRankedScore" double precision,
	"rankedScores" integer,
	"unrankedScores" integer,
	"rankedScoresImproved" integer,
	"unrankedScoresImproved" integer,
	"totalRankedScores" integer,
	"totalUnrankedScores" integer,
	"totalScores" integer,
	"averageRankedAccuracy" double precision,
	"averageUnrankedAccuracy" double precision,
	"averageAccuracy" double precision,
	"medals" integer,
	"aPlays" integer,
	"sPlays" integer,
	"spPlays" integer,
	"ssPlays" integer,
	"sspPlays" integer,
	"godPlays" integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX "player_history_player_id_date_unique" ON "player-history" USING btree ("playerId","date");--> statement-breakpoint
CREATE INDEX "player_history_player_id_date_idx" ON "player-history" USING btree ("playerId","date" DESC NULLS LAST);