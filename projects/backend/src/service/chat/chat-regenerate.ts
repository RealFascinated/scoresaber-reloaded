import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "../../db";
import { chatMessagesTable } from "../../db/schema";

/**
 * Deletes the last user message of a conversation and every reply after it, so the turn can be sent
 * again without storing the user message twice.
 */
export async function deleteLastTurn(conversationId: string) {
  const [lastUserMessage] = await db
    .select({ ordinal: chatMessagesTable.ordinal })
    .from(chatMessagesTable)
    .where(and(eq(chatMessagesTable.conversationId, conversationId), eq(chatMessagesTable.role, "user")))
    .orderBy(desc(chatMessagesTable.ordinal))
    .limit(1);
  if (!lastUserMessage) {
    return;
  }
  await db
    .delete(chatMessagesTable)
    .where(
      and(
        eq(chatMessagesTable.conversationId, conversationId),
        gte(chatMessagesTable.ordinal, lastUserMessage.ordinal)
      )
    );
}
