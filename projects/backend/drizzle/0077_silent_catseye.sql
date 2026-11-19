ALTER TABLE "chat-conversations" ADD COLUMN "systemTokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "chat-conversations" ADD COLUMN "toolTokens" integer DEFAULT 0 NOT NULL;