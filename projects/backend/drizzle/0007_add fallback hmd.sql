ALTER TABLE "scoresaber-accounts" ALTER COLUMN "hmd" SET DEFAULT 'Unknown';--> statement-breakpoint
ALTER TABLE "scoresaber-accounts" ALTER COLUMN "hmd" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "scoresaber-medal-scores" ALTER COLUMN "hmd" SET DEFAULT 'Unknown';--> statement-breakpoint
ALTER TABLE "scoresaber-medal-scores" ALTER COLUMN "hmd" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "scoresaber-score-history" ALTER COLUMN "hmd" SET DEFAULT 'Unknown';--> statement-breakpoint
ALTER TABLE "scoresaber-score-history" ALTER COLUMN "hmd" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "scoresaber-scores" ALTER COLUMN "hmd" SET DEFAULT 'Unknown';--> statement-breakpoint
ALTER TABLE "scoresaber-scores" ALTER COLUMN "hmd" SET NOT NULL;