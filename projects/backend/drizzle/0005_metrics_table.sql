CREATE TABLE "metrics" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"value" jsonb,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
