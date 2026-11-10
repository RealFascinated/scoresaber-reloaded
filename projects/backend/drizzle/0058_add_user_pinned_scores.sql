CREATE TABLE "user-pinned-scores" (
	"userId" text NOT NULL,
	"leaderboardId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user-pinned-scores_userId_leaderboardId_pk" PRIMARY KEY("userId","leaderboardId")
);
--> statement-breakpoint
ALTER TABLE "user-pinned-scores" ADD CONSTRAINT "user-pinned-scores_userId_auth-users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."auth-users"("id") ON DELETE cascade ON UPDATE no action;