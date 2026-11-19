CREATE TABLE "chat-conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"title" text,
	"summary" text,
	"summarizedUpTo" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat-messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversationId" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"role" varchar(16) NOT NULL,
	"parts" jsonb NOT NULL,
	"tokenEstimate" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat-conversations" ADD CONSTRAINT "chat-conversations_userId_auth-users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."auth-users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat-messages" ADD CONSTRAINT "chat-messages_conversationId_chat-conversations_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."chat-conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_conversations_user_updated_idx" ON "chat-conversations" USING btree ("userId","updatedAt" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "chat_messages_conversation_ordinal_idx" ON "chat-messages" USING btree ("conversationId","ordinal");