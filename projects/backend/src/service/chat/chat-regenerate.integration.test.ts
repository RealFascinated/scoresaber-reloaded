import type { ChatMessagePart } from "@ssr/common/schemas/chat/chat-message";
import { describe, expect, test } from "bun:test";
import { db } from "../../db";
import { authUsersTable } from "../../db/schema";
import { ChatConversationService } from "./chat-conversation.service";
import { deleteLastTurn } from "./chat-regenerate";

function textParts(text: string) {
  const part = { type: "text", text };
  const parts: ChatMessagePart[] = [part];
  return parts;
}

async function createConversation() {
  const id = `chat-regenerate-${crypto.randomUUID()}`;
  await db.insert(authUsersTable).values({ id, name: "Regenerate", email: `${id}@example.com` });
  return ChatConversationService.create(id);
}

describe("deleteLastTurn", () => {
  test("removes the last user message and the replies after it", async () => {
    const conversation = await createConversation();
    await ChatConversationService.addMessage(conversation.id, "user", textParts("first"), 1);
    await ChatConversationService.addMessage(conversation.id, "assistant", textParts("one"), 1);
    await ChatConversationService.addMessage(conversation.id, "user", textParts("second"), 1);
    await ChatConversationService.addMessage(conversation.id, "assistant", textParts("two"), 1);

    await deleteLastTurn(conversation.id);

    const messages = await ChatConversationService.getMessages(conversation.id);
    expect(messages.map(message => message.role)).toEqual(["user", "assistant"]);
    expect(messages[0].parts).toEqual(textParts("first"));
  });

  test("does nothing for a conversation without messages", async () => {
    const conversation = await createConversation();
    await deleteLastTurn(conversation.id);
    expect(await ChatConversationService.getMessages(conversation.id)).toEqual([]);
  });
});
