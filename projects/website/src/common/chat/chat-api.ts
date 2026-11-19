import { CHAT_ROUTE } from "@ssr/common/api-routes";
import { env } from "@ssr/common/env";
import type { ChatContextUsage, ChatConversation } from "@ssr/common/schemas/chat/chat-conversation";
import type {
  ChatConversationResponse,
  ChatConversationsResponse,
  ChatStatusResponse,
} from "@ssr/common/schemas/response/chat/chat";

function chatUrl(path: string) {
  return `${env.NEXT_PUBLIC_API_URL}${CHAT_ROUTE}${path}`;
}

async function chatRequest(path: string, init: RequestInit = {}) {
  return fetch(chatUrl(path), { ...init, credentials: "include", cache: "no-store" });
}

/**
 * The URL the AI SDK transport streams a reply from.
 */
export function chatMessagesUrl(conversationId: string) {
  return chatUrl(`/conversations/${encodeURIComponent(conversationId)}/messages`);
}

/**
 * Fetches whether the backend has chat enabled.
 *
 * @throws when the backend could not be reached or answered with an error
 */
export async function fetchChatStatus() {
  const response = await chatRequest("/status");
  if (!response.ok) {
    throw new Error(`Failed to fetch the chat status (${response.status})`);
  }
  return ((await response.json()) as ChatStatusResponse).enabled;
}

/**
 * Fetches one page of the signed-in user's conversations, newest first.
 *
 * @throws when the backend could not be reached or answered with an error
 */
export async function fetchChatConversations(page: number) {
  const response = await chatRequest(`/conversations?page=${page}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch chats (${response.status})`);
  }
  return (await response.json()) as ChatConversationsResponse;
}

/**
 * Creates an empty conversation that the first message is sent to.
 *
 * @throws when the backend could not be reached or answered with an error
 */
export async function createChatConversation() {
  const response = await chatRequest("/conversations", { method: "POST" });
  if (!response.ok) {
    throw new Error(`Failed to start a chat (${response.status})`);
  }
  return (await response.json()) as ChatConversation;
}

/**
 * Fetches a conversation and its messages.
 *
 * @throws when the backend could not be reached or answered with an error
 */
export async function fetchChatConversation(conversationId: string) {
  const response = await chatRequest(`/conversations/${encodeURIComponent(conversationId)}`);
  if (!response.ok) {
    throw new Error(`Failed to load the chat (${response.status})`);
  }
  return (await response.json()) as ChatConversationResponse;
}

/**
 * Renames a conversation.
 *
 * @throws when the backend could not be reached or answered with an error
 */
export async function renameChatConversation(conversationId: string, title: string) {
  const response = await chatRequest(`/conversations/${encodeURIComponent(conversationId)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!response.ok) {
    throw new Error(`Failed to rename the chat (${response.status})`);
  }
  return (await response.json()) as ChatConversation;
}

/**
 * Deletes a conversation and its messages.
 *
 * @throws when the backend could not be reached or answered with an error
 */
export async function deleteChatConversation(conversationId: string) {
  const response = await chatRequest(`/conversations/${encodeURIComponent(conversationId)}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Failed to delete the chat (${response.status})`);
  }
}

/**
 * Fetches the estimated context window usage of a conversation, null before its first turn.
 *
 * @throws when the backend could not be reached or answered with an error
 */
export async function fetchChatContextUsage(conversationId: string) {
  const response = await chatRequest(`/conversations/${encodeURIComponent(conversationId)}/context`);
  if (!response.ok) {
    throw new Error(`Failed to fetch the context usage (${response.status})`);
  }
  return (await response.json()) as ChatContextUsage | null;
}
