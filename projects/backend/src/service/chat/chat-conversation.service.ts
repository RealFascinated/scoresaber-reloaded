import { NotFoundError } from "@ssr/common/error/not-found-error";
import type { ChatConversation } from "@ssr/common/schemas/chat/chat-conversation";
import type { ChatMessage, ChatMessagePart } from "@ssr/common/schemas/chat/chat-message";
import { and, asc, count, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "../../db";
import { chatConversationsTable, chatMessagesTable } from "../../db/schema";

export type ChatConversationRow = typeof chatConversationsTable.$inferSelect;
export type ChatMessageRow = typeof chatMessagesTable.$inferSelect;

export class ChatConversationService {
  public static toConversation(row: ChatConversationRow) {
    return {
      id: row.id,
      title: row.title,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    } satisfies ChatConversation;
  }

  public static toMessage(row: ChatMessageRow) {
    return {
      id: row.id,
      role: row.role,
      parts: row.parts,
      createdAt: row.createdAt.toISOString(),
    } satisfies ChatMessage;
  }

  /**
   * Lists the conversations of a user, most recently updated first.
   */
  public static async list(userId: string, page: number, itemsPerPage: number) {
    const [rows, [{ total }]] = await Promise.all([
      db
        .select()
        .from(chatConversationsTable)
        .where(eq(chatConversationsTable.userId, userId))
        .orderBy(desc(chatConversationsTable.updatedAt))
        .limit(itemsPerPage)
        .offset((page - 1) * itemsPerPage),
      db
        .select({ total: count() })
        .from(chatConversationsTable)
        .where(eq(chatConversationsTable.userId, userId)),
    ]);

    return { rows, total };
  }

  public static async create(userId: string) {
    const [row] = await db.insert(chatConversationsTable).values({ userId }).returning();
    return row;
  }

  /**
   * Gets a conversation that belongs to the user, throws a not found error otherwise.
   */
  public static async getOwned(userId: string, conversationId: string) {
    const [row] = await db
      .select()
      .from(chatConversationsTable)
      .where(and(eq(chatConversationsTable.id, conversationId), eq(chatConversationsTable.userId, userId)))
      .limit(1);
    if (!row) {
      throw new NotFoundError("Conversation not found");
    }
    return row;
  }

  public static async rename(userId: string, conversationId: string, title: string) {
    const [row] = await db
      .update(chatConversationsTable)
      .set({ title })
      .where(and(eq(chatConversationsTable.id, conversationId), eq(chatConversationsTable.userId, userId)))
      .returning();
    if (!row) {
      throw new NotFoundError("Conversation not found");
    }
    return row;
  }

  public static async delete(userId: string, conversationId: string) {
    const rows = await db
      .delete(chatConversationsTable)
      .where(and(eq(chatConversationsTable.id, conversationId), eq(chatConversationsTable.userId, userId)))
      .returning({ id: chatConversationsTable.id });
    if (rows.length === 0) {
      throw new NotFoundError("Conversation not found");
    }
  }

  public static getMessages(conversationId: string) {
    return ChatConversationService.getMessagesAfter(conversationId, 0);
  }

  /**
   * Gets the messages of a conversation with an ordinal greater than `ordinal`, in order.
   */
  public static getMessagesAfter(conversationId: string, ordinal: number) {
    return db
      .select()
      .from(chatMessagesTable)
      .where(
        and(eq(chatMessagesTable.conversationId, conversationId), gt(chatMessagesTable.ordinal, ordinal))
      )
      .orderBy(asc(chatMessagesTable.ordinal));
  }

  /**
   * Appends a message to a conversation with the next ordinal and bumps the conversation's updated date.
   */
  public static async addMessage(
    conversationId: string,
    role: ChatMessageRow["role"],
    parts: ChatMessagePart[],
    tokenEstimate: number
  ) {
    const [row] = await db
      .insert(chatMessagesTable)
      .values({
        conversationId,
        role,
        parts,
        tokenEstimate,
        ordinal: sql`(select coalesce(max(m."ordinal"), 0) + 1 from "chat-messages" m where m."conversationId" = ${conversationId})`,
      })
      .returning();
    await db
      .update(chatConversationsTable)
      .set({ updatedAt: new Date() })
      .where(eq(chatConversationsTable.id, conversationId));
    return row;
  }

  public static async setSummary(conversationId: string, summary: string, summarizedUpTo: number) {
    await db
      .update(chatConversationsTable)
      .set({ summary, summarizedUpTo })
      .where(eq(chatConversationsTable.id, conversationId));
  }

  /**
   * Sets the title only when the conversation has none yet, so a rename is never overwritten.
   */
  public static async setTitleIfEmpty(conversationId: string, title: string) {
    await db
      .update(chatConversationsTable)
      .set({ title })
      .where(and(eq(chatConversationsTable.id, conversationId), isNull(chatConversationsTable.title)));
  }
}
