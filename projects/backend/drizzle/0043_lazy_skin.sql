ALTER TABLE "scoresaber-score-history" ADD COLUMN "rank" integer DEFAULT -1 NOT NULL;--> statement-breakpoint
ALTER TABLE "scoresaber-score-history" ADD COLUMN "weight" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "scoresaber-scores" ADD COLUMN "rank" integer DEFAULT -1 NOT NULL;--> statement-breakpoint
ALTER TABLE "scoresaber-scores" ADD COLUMN "weight" double precision DEFAULT 0 NOT NULL;