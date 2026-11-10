CREATE TABLE "beatleader-pbot" (
	"scoreId" integer PRIMARY KEY NOT NULL,
	"accuracyBySecond" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user-overlays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"name" varchar(64) NOT NULL,
	"settings" jsonb NOT NULL,
	"layout" jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user-overlays" ADD CONSTRAINT "user-overlays_userId_auth-users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."auth-users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_overlays_user_id_idx" ON "user-overlays" USING btree ("userId");