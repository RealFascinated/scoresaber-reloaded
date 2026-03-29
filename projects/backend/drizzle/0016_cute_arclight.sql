ALTER TABLE "scoresaber-players" RENAME TO "scoresaber-accounts";--> statement-breakpoint
DROP INDEX "players_name_idx";--> statement-breakpoint
ALTER TABLE "scoresaber-accounts" ADD COLUMN "cachedProfilePicture" boolean NOT NULL;--> statement-breakpoint
ALTER TABLE "scoresaber-accounts" ADD COLUMN "trackedSince" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "scoresaber-accounts" ADD COLUMN "joinedDate" timestamp NOT NULL;--> statement-breakpoint
CREATE INDEX "accounts_name_idx" ON "scoresaber-accounts" USING btree ("name");--> statement-breakpoint
CREATE INDEX "accounts_medals_idx" ON "scoresaber-accounts" USING btree ("medals" DESC NULLS LAST);