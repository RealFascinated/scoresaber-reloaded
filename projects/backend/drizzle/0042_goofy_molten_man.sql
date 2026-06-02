ALTER TABLE "scoresaber-accounts" ADD COLUMN IF NOT EXISTS "avatar" text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE "scoresaber-accounts" ALTER COLUMN "avatar" DROP DEFAULT;
