CREATE TABLE "user-follows" (
	"userId" text NOT NULL,
	"followingPlayerId" varchar(32) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user-follows_userId_followingPlayerId_pk" PRIMARY KEY("userId","followingPlayerId")
);
--> statement-breakpoint
ALTER TABLE "user-follows" ADD CONSTRAINT "user-follows_userId_auth-users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."auth-users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_follows_following_player_id_idx" ON "user-follows" USING btree ("followingPlayerId");