import { Type, type StaticDecode } from "typebox";

export const ChatConversationSchema = Type.Object({
  id: Type.String(),
  /** Null until the title is generated */
  title: Type.Union([Type.String(), Type.Null()]),
  /** ISO date */
  createdAt: Type.String(),
  /** ISO date */
  updatedAt: Type.String(),
});
export type ChatConversation = StaticDecode<typeof ChatConversationSchema>;

export const ChatConversationRenameBodySchema = Type.Object({
  title: Type.String({ minLength: 1, maxLength: 100, pattern: "\\S" }),
});
export type ChatConversationRenameBody = StaticDecode<typeof ChatConversationRenameBodySchema>;

export const CHAT_CONVERSATIONS_PER_PAGE = 30;

export const ChatConversationParamsSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
});
export type ChatConversationParams = StaticDecode<typeof ChatConversationParamsSchema>;

export const ChatConversationsQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, maximum: 1000 })),
});
export type ChatConversationsQuery = StaticDecode<typeof ChatConversationsQuerySchema>;

/** The estimated size of one tool definition sent with every request */
export const ChatContextToolSchema = Type.Object({
  name: Type.String(),
  tokens: Type.Integer({ minimum: 0 }),
});
export type ChatContextTool = StaticDecode<typeof ChatContextToolSchema>;

/**
 * Where the context window of a conversation goes, as estimated after its last turn. Free space is
 * whatever `maxTokens` leaves after every other field.
 */
export const ChatContextUsageSchema = Type.Object({
  maxTokens: Type.Integer({ minimum: 1 }),
  systemPromptTokens: Type.Integer({ minimum: 0 }),
  /** Sorted by size, largest first */
  tools: Type.Array(ChatContextToolSchema),
  /** The rolling summary of the compacted messages */
  summaryTokens: Type.Integer({ minimum: 0 }),
  userMessageTokens: Type.Integer({ minimum: 0 }),
  /** Assistant replies including their tool calls and results */
  assistantMessageTokens: Type.Integer({ minimum: 0 }),
  /** Kept free for the next reply */
  replyReserveTokens: Type.Integer({ minimum: 0 }),
});
export type ChatContextUsage = StaticDecode<typeof ChatContextUsageSchema>;
