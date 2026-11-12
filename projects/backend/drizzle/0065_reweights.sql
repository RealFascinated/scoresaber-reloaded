CREATE TABLE "scoresaber-reweight-players" (
	"reweightId" integer NOT NULL,
	"playerId" varchar(32) NOT NULL,
	"ppBefore" double precision NOT NULL,
	"ppAfter" double precision NOT NULL,
	"ppDelta" double precision NOT NULL,
	"scoresChanged" integer NOT NULL,
	CONSTRAINT "scoresaber-reweight-players_reweightId_playerId_pk" PRIMARY KEY("reweightId","playerId")
);
--> statement-breakpoint
CREATE TABLE "scoresaber-reweight-scores" (
	"reweightId" integer NOT NULL,
	"scoreId" integer NOT NULL,
	"playerId" varchar(32) NOT NULL,
	"leaderboardId" integer NOT NULL,
	"ppBefore" double precision NOT NULL,
	"ppAfter" double precision NOT NULL,
	CONSTRAINT "scoresaber-reweight-scores_reweightId_scoreId_pk" PRIMARY KEY("reweightId","scoreId")
);
--> statement-breakpoint
CREATE TABLE "scoresaber-reweights" (
	"id" serial PRIMARY KEY NOT NULL,
	"realmId" integer DEFAULT 1 NOT NULL,
	"name" text,
	"startedAt" timestamp NOT NULL,
	"endedAt" timestamp NOT NULL,
	"leaderboardCount" integer DEFAULT 0 NOT NULL,
	"playerCount" integer DEFAULT 0 NOT NULL,
	"scoreCount" integer DEFAULT 0 NOT NULL,
	"notifiedAt" timestamp
);
--> statement-breakpoint
ALTER TABLE "scoresaber-leaderboard-star-change" RENAME TO "scoresaber-reweight-leaderboards";--> statement-breakpoint
ALTER TABLE "scoresaber-reweight-leaderboards" ADD COLUMN "reweightId" integer;--> statement-breakpoint
ALTER TABLE "scoresaber-reweight-leaderboards" ADD COLUMN "ppPending" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "reweight_players_player_idx" ON "scoresaber-reweight-players" USING btree ("playerId","reweightId" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "reweight_players_delta_idx" ON "scoresaber-reweight-players" USING btree ("reweightId","ppDelta");--> statement-breakpoint
CREATE INDEX "reweight_scores_player_idx" ON "scoresaber-reweight-scores" USING btree ("playerId","reweightId");--> statement-breakpoint
CREATE INDEX "reweight_scores_leaderboard_idx" ON "scoresaber-reweight-scores" USING btree ("reweightId","leaderboardId");--> statement-breakpoint
CREATE INDEX "reweights_realm_started_idx" ON "scoresaber-reweights" USING btree ("realmId","startedAt" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "leaderboard_star_change_reweight_idx" ON "scoresaber-reweight-leaderboards" USING btree ("reweightId");