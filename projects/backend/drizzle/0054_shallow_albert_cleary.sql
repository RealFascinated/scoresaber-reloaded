CREATE TABLE "scoresaber-leaderboard-realms" (
	"leaderboardId" integer NOT NULL,
	"realmId" integer NOT NULL,
	"ranked" boolean NOT NULL,
	"qualified" boolean NOT NULL,
	"stars" double precision DEFAULT 0 NOT NULL,
	"rankedDate" timestamp,
	"qualifiedDate" timestamp,
	CONSTRAINT "scoresaber-leaderboard-realms_leaderboardId_realmId_pk" PRIMARY KEY("leaderboardId","realmId")
);
--> statement-breakpoint
CREATE TABLE "scoresaber-score-realms" (
	"scoreId" integer NOT NULL,
	"realmId" integer NOT NULL,
	"playerId" varchar(32) NOT NULL,
	"leaderboardId" integer NOT NULL,
	"pp" double precision NOT NULL,
	CONSTRAINT "scoresaber-score-realms_scoreId_realmId_pk" PRIMARY KEY("scoreId","realmId")
);
--> statement-breakpoint
DROP INDEX IF EXISTS "scoresaber_player_history_player_id_date_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "leaderboards_ranked_true_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "leaderboards_qualified_true_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "leaderboards_ranked_date_desc_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "leaderboards_stars_not_null_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "scores_player_pp_desc_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "scores_pp_desc_scoreid_desc_idx";--> statement-breakpoint
ALTER TABLE "scoresaber-player-history" ADD COLUMN "realmId" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "scoresaber-leaderboard-star-change" ADD COLUMN "realmId" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE INDEX "leaderboard_realms_ranked_true_idx" ON "scoresaber-leaderboard-realms" USING btree ("realmId","leaderboardId") WHERE "scoresaber-leaderboard-realms"."ranked" = true;--> statement-breakpoint
CREATE INDEX "leaderboard_realms_qualified_true_idx" ON "scoresaber-leaderboard-realms" USING btree ("realmId","leaderboardId") WHERE "scoresaber-leaderboard-realms"."qualified" = true;--> statement-breakpoint
CREATE INDEX "leaderboard_realms_ranked_date_desc_idx" ON "scoresaber-leaderboard-realms" USING btree ("realmId","rankedDate" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "leaderboard_realms_stars_idx" ON "scoresaber-leaderboard-realms" USING btree ("realmId","stars");--> statement-breakpoint
CREATE INDEX "score_realms_player_pp_desc_idx" ON "scoresaber-score-realms" USING btree ("realmId","playerId","pp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "score_realms_pp_desc_scoreid_desc_idx" ON "scoresaber-score-realms" USING btree ("realmId","pp" DESC NULLS LAST,"scoreId" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "score_realms_leaderboard_idx" ON "scoresaber-score-realms" USING btree ("realmId","leaderboardId");--> statement-breakpoint
CREATE UNIQUE INDEX "scoresaber_player_history_player_id_date_realm_unique" ON "scoresaber-player-history" USING btree ("playerId","date","realmId");--> statement-breakpoint
INSERT INTO "scoresaber-leaderboard-realms" ("leaderboardId", "realmId", "ranked", "qualified", "stars", "rankedDate", "qualifiedDate") SELECT "id", 1, "ranked", "qualified", "stars", "rankedDate", "qualifiedDate" FROM "scoresaber-leaderboards" WHERE "ranked" = true OR "qualified" = true;--> statement-breakpoint
INSERT INTO "scoresaber-score-realms" ("scoreId", "realmId", "playerId", "leaderboardId", "pp") SELECT "scoreId", 1, "playerId", "leaderboardId", "pp" FROM "scoresaber-scores" WHERE "pp" > 0;--> statement-breakpoint
ALTER TABLE "scoresaber-leaderboards" DROP COLUMN "ranked";--> statement-breakpoint
ALTER TABLE "scoresaber-leaderboards" DROP COLUMN "qualified";--> statement-breakpoint
ALTER TABLE "scoresaber-leaderboards" DROP COLUMN "stars";--> statement-breakpoint
ALTER TABLE "scoresaber-leaderboards" DROP COLUMN "rankedDate";--> statement-breakpoint
ALTER TABLE "scoresaber-leaderboards" DROP COLUMN "qualifiedDate";--> statement-breakpoint
ALTER TABLE "scoresaber-scores" DROP COLUMN "pp";