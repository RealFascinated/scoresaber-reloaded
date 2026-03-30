CREATE TABLE "beatleader-scores" (
	"id" integer PRIMARY KEY NOT NULL,
	"playerId" varchar(32) NOT NULL,
	"songHash" varchar(64) NOT NULL,
	"leaderboardId" text NOT NULL,
	"songDifficulty" varchar(64) NOT NULL,
	"songCharacteristic" varchar(128) NOT NULL,
	"songScore" integer NOT NULL,
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
CREATE TABLE "player-history" (
	"id" serial PRIMARY KEY NOT NULL,
	"playerId" varchar(32) NOT NULL,
	"date" timestamp NOT NULL,
	"rank" integer,
	"countryRank" integer,
	"medals" integer,
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
	"aPlays" integer,
	"sPlays" integer,
	"spPlays" integer,
	"ssPlays" integer,
	"sspPlays" integer,
	"godPlays" integer
);
--> statement-breakpoint
CREATE TABLE "scoresaber-accounts" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"country" varchar(32),
	"peakRank" integer,
	"peakRankTimestamp" timestamp,
	"seededScores" boolean NOT NULL,
	"seededBeatLeaderScores" boolean NOT NULL,
	"cachedProfilePicture" boolean NOT NULL,
	"trackReplays" boolean NOT NULL,
	"inactive" boolean NOT NULL,
	"banned" boolean NOT NULL,
	"hmd" varchar(32),
	"pp" double precision DEFAULT 0 NOT NULL,
	"medals" integer DEFAULT 0 NOT NULL,
	"scoreStats" jsonb NOT NULL,
	"trackedSince" timestamp NOT NULL,
	"joinedDate" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scoresaber-leaderboard-star-change" (
	"id" serial PRIMARY KEY NOT NULL,
	"leaderboardId" integer NOT NULL,
	"previousStars" double precision NOT NULL,
	"newStars" double precision NOT NULL,
	"timestamp" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scoresaber-leaderboards" (
	"id" integer PRIMARY KEY NOT NULL,
	"songHash" varchar(64) NOT NULL,
	"songName" text NOT NULL,
	"songSubName" text NOT NULL,
	"songAuthorName" text NOT NULL,
	"levelAuthorName" text NOT NULL,
	"difficulty" varchar(64) NOT NULL,
	"characteristic" text NOT NULL,
	"maxScore" integer NOT NULL,
	"ranked" boolean NOT NULL,
	"qualified" boolean NOT NULL,
	"stars" double precision,
	"rankedDate" timestamp,
	"qualifiedDate" timestamp,
	"plays" integer NOT NULL,
	"dailyPlays" integer NOT NULL,
	"seededScores" boolean NOT NULL,
	"cachedSongArt" boolean NOT NULL,
	"timestamp" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scoresaber-medal-scores" (
	"id" integer PRIMARY KEY NOT NULL,
	"playerId" varchar(32) NOT NULL,
	"leaderboardId" integer NOT NULL,
	"difficulty" varchar(64) NOT NULL,
	"characteristic" varchar(128) NOT NULL,
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
CREATE TABLE "scoresaber-score-history" (
	"id" serial PRIMARY KEY NOT NULL,
	"playerId" varchar(32) NOT NULL,
	"leaderboardId" integer NOT NULL,
	"scoreId" integer NOT NULL,
	"difficulty" varchar(64) NOT NULL,
	"characteristic" varchar(128) NOT NULL,
	"score" integer NOT NULL,
	"accuracy" double precision NOT NULL,
	"pp" double precision DEFAULT 0 NOT NULL,
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
CREATE TABLE "scoresaber-scores" (
	"id" integer PRIMARY KEY NOT NULL,
	"playerId" varchar(32) NOT NULL,
	"leaderboardId" integer NOT NULL,
	"difficulty" varchar(64) NOT NULL,
	"characteristic" varchar(128) NOT NULL,
	"score" integer NOT NULL,
	"accuracy" double precision NOT NULL,
	"pp" double precision DEFAULT 0 NOT NULL,
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
CREATE INDEX "beatleader_scores_player_map_score_time_idx" ON "beatleader-scores" USING btree ("playerId","songHash","songDifficulty","songCharacteristic","songScore","timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "beatleader_scores_saved_replay_true_idx" ON "beatleader-scores" USING btree ("savedReplay") WHERE "beatleader-scores"."savedReplay" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "player_history_player_id_date_unique" ON "player-history" USING btree ("playerId","date");--> statement-breakpoint
CREATE INDEX "player_history_player_id_date_idx" ON "player-history" USING btree ("playerId","date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "accounts_name_idx" ON "scoresaber-accounts" USING btree ("name");--> statement-breakpoint
CREATE INDEX "accounts_medals_idx" ON "scoresaber-accounts" USING btree ("medals" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "accounts_inactive_true_idx" ON "scoresaber-accounts" USING btree ("inactive") WHERE "scoresaber-accounts"."inactive" = true;--> statement-breakpoint
CREATE INDEX "leaderboard_star_change_leaderboard_time_idx" ON "scoresaber-leaderboard-star-change" USING btree ("leaderboardId","timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "leaderboards_search_idx" ON "scoresaber-leaderboards" USING gin (to_tsvector('english', "songName" || ' ' || "songSubName" || ' ' || "songAuthorName" || ' ' || "levelAuthorName"));--> statement-breakpoint
CREATE INDEX "leaderboards_song_lookup_idx" ON "scoresaber-leaderboards" USING btree (lower("songHash"),"difficulty","characteristic");--> statement-breakpoint
CREATE INDEX "leaderboards_song_hash_idx" ON "scoresaber-leaderboards" USING btree ("songHash");--> statement-breakpoint
CREATE INDEX "medal_scores_leaderboard_score_idx" ON "scoresaber-medal-scores" USING btree ("leaderboardId","score" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "scoresaber_score_history_leaderboard_idx" ON "scoresaber-score-history" USING btree ("leaderboardId");--> statement-breakpoint
CREATE INDEX "scoresaber_score_history_player_leaderboard_time_idx" ON "scoresaber-score-history" USING btree ("playerId","leaderboardId","timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "scores_player_leaderboard_idx" ON "scoresaber-scores" USING btree ("playerId","leaderboardId");--> statement-breakpoint
CREATE INDEX "scores_leaderboard_id_idx" ON "scoresaber-scores" USING btree ("leaderboardId");--> statement-breakpoint
CREATE INDEX "scores_pp_positive_idx" ON "scoresaber-scores" USING btree ("pp" DESC NULLS LAST) WHERE "scoresaber-scores"."pp" > 0;