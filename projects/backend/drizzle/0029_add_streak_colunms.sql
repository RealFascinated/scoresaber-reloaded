ALTER TABLE "scoresaber-accounts" ADD COLUMN "currentStreak" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "scoresaber-accounts" ADD COLUMN "longestStreak" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "scoresaber-accounts" ADD COLUMN "lastPlayedDate" date;