CREATE TABLE "auth-accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"password" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth-connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"provider" varchar(16) NOT NULL,
	"providerPlayerId" varchar(32) NOT NULL,
	"isPrimary" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth-sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"token" text NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "auth-sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "auth-users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"playerId" varchar(32),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "auth-users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "auth-verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth-accounts" ADD CONSTRAINT "auth-accounts_userId_auth-users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."auth-users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth-connections" ADD CONSTRAINT "auth-connections_userId_auth-users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."auth-users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth-sessions" ADD CONSTRAINT "auth-sessions_userId_auth-users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."auth-users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_accounts_user_id_idx" ON "auth-accounts" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_accounts_provider_account_idx" ON "auth-accounts" USING btree ("providerId","accountId");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_connections_provider_player_idx" ON "auth-connections" USING btree ("provider","providerPlayerId");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_connections_primary_idx" ON "auth-connections" USING btree ("userId") WHERE "auth-connections"."isPrimary";--> statement-breakpoint
CREATE INDEX "auth_connections_user_id_idx" ON "auth-connections" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_id_idx" ON "auth-sessions" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_users_player_id_idx" ON "auth-users" USING btree ("playerId");--> statement-breakpoint
CREATE INDEX "auth_verifications_identifier_idx" ON "auth-verifications" USING btree ("identifier");