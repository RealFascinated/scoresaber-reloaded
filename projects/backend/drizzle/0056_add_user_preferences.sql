CREATE TABLE "user-preferences" (
	"userId" text PRIMARY KEY NOT NULL,
	"preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user-preferences" ADD CONSTRAINT "user-preferences_userId_auth-users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."auth-users"("id") ON DELETE cascade ON UPDATE no action;