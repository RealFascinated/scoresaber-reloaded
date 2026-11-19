ALTER TABLE "chat-conversations" ADD COLUMN "contextUsage" jsonb;--> statement-breakpoint
ALTER TABLE "chat-conversations" DROP COLUMN "systemTokens";--> statement-breakpoint
ALTER TABLE "chat-conversations" DROP COLUMN "toolTokens";