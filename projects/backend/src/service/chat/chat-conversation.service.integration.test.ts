import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { authUsersTable, chatMessagesTable } from "../../db/schema";
import { ChatConversationService } from "./chat-conversation.service";

async function createConversation() {
  const id = `chat-test-${crypto.randomUUID()}`;
  await db.insert(authUsersTable).values({ id, name: "Chat Tester", email: `${id}@example.com` });
  return ChatConversationService.create(id);
}

describe("ChatConversationService", () => {
  test("assigns distinct sequential ordinals to concurrent appends", async () => {
    const conversation = await createConversation();
    const part = { type: "text", text: "hi" };

    await Promise.all(
      Array.from({ length: 10 }, () => ChatConversationService.addMessage(conversation.id, "user", [part], 1))
    );

    const ordinals = (await ChatConversationService.getMessages(conversation.id)).map(row => row.ordinal);
    expect(ordinals).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  test("deleteMessage removes a single message", async () => {
    const conversation = await createConversation();
    const part = { type: "text", text: "hi" };
    const row = await ChatConversationService.addMessage(conversation.id, "user", [part], 1);

    await ChatConversationService.deleteMessage(row.id);

    expect(await db.select().from(chatMessagesTable).where(eq(chatMessagesTable.id, row.id))).toHaveLength(0);
  });

  test("setSummary never moves summarizedUpTo backwards", async () => {
    const conversation = await createConversation();

    await ChatConversationService.setSummary(conversation.id, "newer", 8);
    await ChatConversationService.setSummary(conversation.id, "older", 5);

    const stored = await ChatConversationService.getOwned(conversation.userId, conversation.id);
    expect(stored.summary).toBe("newer");
    expect(stored.summarizedUpTo).toBe(8);
  });
});
