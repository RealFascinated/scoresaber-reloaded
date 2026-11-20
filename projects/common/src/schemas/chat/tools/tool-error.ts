import { Type, type StaticDecode } from "typebox";

export const ChatToolErrorSchema = Type.Object({
  code: Type.Union([Type.Literal("invalid_input"), Type.Literal("not_found"), Type.Literal("unavailable")]),
  message: Type.String(),
  retryable: Type.Boolean(),
  hint: Type.Optional(Type.String()),
});
export type ChatToolErrorPayload = StaticDecode<typeof ChatToolErrorSchema>;
export type ChatToolErrorCode = ChatToolErrorPayload["code"];
