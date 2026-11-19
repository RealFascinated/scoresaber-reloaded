import { Type, type StaticDecode } from "typebox";
import { ChatConversationSchema } from "../../chat/chat-conversation";
import { ChatMessageSchema } from "../../chat/chat-message";
import { PaginationMetadataSchema } from "../../pagination";

export const ChatConversationsResponseSchema = Type.Object({
  items: Type.Array(ChatConversationSchema),
  metadata: PaginationMetadataSchema,
});
export type ChatConversationsResponse = StaticDecode<typeof ChatConversationsResponseSchema>;

export const ChatConversationResponseSchema = Type.Object({
  conversation: ChatConversationSchema,
  /** The full history in order, compaction only affects what the model sees */
  messages: Type.Array(ChatMessageSchema),
});
export type ChatConversationResponse = StaticDecode<typeof ChatConversationResponseSchema>;

export const ChatStatusResponseSchema = Type.Object({
  enabled: Type.Boolean(),
});
export type ChatStatusResponse = StaticDecode<typeof ChatStatusResponseSchema>;
