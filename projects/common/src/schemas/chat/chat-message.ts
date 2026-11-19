import { Type, type StaticDecode } from "typebox";

export const ChatMessageRoleSchema = Type.Union([Type.Literal("user"), Type.Literal("assistant")]);
export type ChatMessageRole = StaticDecode<typeof ChatMessageRoleSchema>;

/**
 * One part of a chat message (text, reasoning, tool call and so on), stored in the AI SDK UI message
 * part format. Only the discriminating `type` is validated, the rest depends on the part type.
 */
export const ChatMessagePartSchema = Type.Object({ type: Type.String() }, { additionalProperties: true });
export type ChatMessagePart = StaticDecode<typeof ChatMessagePartSchema>;

export const ChatMessageSchema = Type.Object({
  id: Type.String(),
  role: ChatMessageRoleSchema,
  parts: Type.Array(ChatMessagePartSchema),
  /** ISO date */
  createdAt: Type.String(),
});
export type ChatMessage = StaticDecode<typeof ChatMessageSchema>;

export const CHAT_MESSAGE_MAX_LENGTH = 4000;

/** The message a user sends, only text is accepted. */
export const SendChatMessageBodySchema = Type.Object({
  id: Type.String({ minLength: 1, maxLength: 64 }),
  text: Type.String({ minLength: 1, maxLength: CHAT_MESSAGE_MAX_LENGTH }),
});
export type SendChatMessageBody = StaticDecode<typeof SendChatMessageBodySchema>;
