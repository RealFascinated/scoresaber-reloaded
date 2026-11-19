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
  title: Type.String({ minLength: 1, maxLength: 100 }),
});
export type ChatConversationRenameBody = StaticDecode<typeof ChatConversationRenameBodySchema>;

export const CHAT_CONVERSATIONS_PER_PAGE = 30;

export const ChatConversationParamsSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
});
export type ChatConversationParams = StaticDecode<typeof ChatConversationParamsSchema>;

export const ChatConversationsQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1 })),
});
export type ChatConversationsQuery = StaticDecode<typeof ChatConversationsQuerySchema>;
