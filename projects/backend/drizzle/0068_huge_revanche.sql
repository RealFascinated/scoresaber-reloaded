CREATE TABLE "scoresaber-account-names" (
	"playerId" varchar(32) NOT NULL,
	"name" text NOT NULL,
	"changedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "scoresaber-account-names_playerId_name_pk" PRIMARY KEY("playerId","name")
);
--> statement-breakpoint
ALTER TABLE "scoresaber-account-names" ADD CONSTRAINT "scoresaber-account-names_playerId_scoresaber-accounts_id_fk" FOREIGN KEY ("playerId") REFERENCES "public"."scoresaber-accounts"("id") ON DELETE cascade ON UPDATE no action;