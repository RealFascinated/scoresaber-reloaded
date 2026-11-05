ALTER TABLE "scoresaber-accounts" ADD COLUMN "beatLeaderSeedPage" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "scoresaber-accounts" ADD COLUMN "beatLeaderSeedAttempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "scoresaber-accounts" ADD COLUMN "beatLeaderSeedLastAttempt" timestamp;