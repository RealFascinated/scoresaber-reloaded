import { CHAT_ROUTE } from "@ssr/common/api-routes";
import { env } from "@ssr/common/env";
import { parseSchema } from "@ssr/common/schemas/parse";
import {
  ChatConversationResponseSchema,
  ChatStatusResponseSchema,
  type ChatConversationResponse,
} from "@ssr/common/schemas/response/chat/chat";
import { cache } from "react";

const CHAT_REQUEST_TIMEOUT_MS = 3000;

async function backendGet(path: string, cookie: string) {
  return fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, {
    headers: { cookie },
    cache: "no-store",
    signal: AbortSignal.timeout(CHAT_REQUEST_TIMEOUT_MS),
  });
}

/**
 * Whether the backend has chat enabled. A failed request counts as disabled, the same as the
 * backend answering with the feature flag turned off.
 */
export const isChatEnabled = cache(async (cookie: string) => {
  try {
    const response = await backendGet(`${CHAT_ROUTE}/status`, cookie);
    if (!response.ok) {
      return false;
    }
    return parseSchema(ChatStatusResponseSchema, await response.json()).enabled;
  } catch {
    return false;
  }
});

export type ServerChatConversation =
  | { status: "found"; data: ChatConversationResponse }
  | { status: "missing" }
  | { status: "unavailable" };

/**
 * Loads a conversation and its messages on the server, so the first paint already shows the history.
 * A 404 means the conversation does not exist or belongs to someone else.
 */
export async function getServerChatConversation(cookie: string, conversationId: string) {
  try {
    const response = await backendGet(
      `${CHAT_ROUTE}/conversations/${encodeURIComponent(conversationId)}`,
      cookie
    );
    if (response.status === 404) {
      const missing: ServerChatConversation = { status: "missing" };
      return missing;
    }
    if (!response.ok) {
      const unavailable: ServerChatConversation = { status: "unavailable" };
      return unavailable;
    }
    const data = parseSchema(ChatConversationResponseSchema, await response.json());
    const found: ServerChatConversation = { status: "found", data };
    return found;
  } catch {
    const unavailable: ServerChatConversation = { status: "unavailable" };
    return unavailable;
  }
}
