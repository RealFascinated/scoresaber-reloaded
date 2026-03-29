ALTER TABLE "beatleader-scores" ADD COLUMN "songDifficulty" varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE "beatleader-scores" ADD COLUMN "songCharacteristic" varchar(128) NOT NULL;--> statement-breakpoint
ALTER TABLE "beatleader-scores" ADD COLUMN "songScore" integer NOT NULL;