import type { ChatMessagePart } from "@ssr/common/schemas/chat/chat-message";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { authUsersTable, chatConversationsTable } from "../../db/schema";
import { ChatConversationService } from "./chat-conversation.service";
import { deleteLastTurn } from "./chat-regenerate";

const USER_ID = "chat-regenerate-test-user";

function textParts(text: string) {
  const part = { type: "text", text };
  const parts: ChatMessagePart[] = [part];
  return parts;
}

describe("deleteLastTurn", () => {
  beforeAll(async () => {
    await db
      .insert(authUsersTable)
      .values({ id: USER_ID, name: "Regenerate", email: `${USER_ID}@example.com` })
      .onConflictDoNothing();
  });

  afterAll(async () => {
    await db.delete(authUsersTable).where(eq(authUsersTable.id, USER_ID));
  });

  test("removes the last user message and the replies after it", async () => {
    const conversation = await ChatConversationService.create(USER_ID);
    await ChatConversationService.addMessage(conversation.id, "user", textParts("first"), 1);
    await ChatConversationService.addMessage(conversation.id, "assistant", textParts("one"), 1);
    await ChatConversationService.addMessage(conversation.id, "user", textParts("second"), 1);
    await ChatConversationService.addMessage(conversation.id, "assistant", textParts("two"), 1);

    await deleteLastTurn(conversation.id);

    const messages = await ChatConversationService.getMessages(conversation.id);
    expect(messages.map(message => message.role)).toEqual(["user", "assistant"]);
    expect(messages[0].parts).toEqual(textParts("first"));

    await db.delete(chatConversationsTable).where(eq(chatConversationsTable.id, conversation.id));
  });

  test("does nothing for a conversation without messages", async () => {
    const conversation = await ChatConversationService.create(USER_ID);
    await deleteLastTurn(conversation.id);
    expect(await ChatConversationService.getMessages(conversation.id)).toEqual([]);
  });
});
