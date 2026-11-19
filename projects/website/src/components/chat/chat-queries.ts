import { fetchChatConversations, fetchChatStatus } from "@/common/chat/chat-api";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

export const CHAT_CONVERSATIONS_QUERY_KEY = ["chat", "conversations"] as const;
export const CHAT_STATUS_QUERY_KEY = ["chat", "status"] as const;

/**
 * Gets whether chat is enabled. Used to hide the navbar entry, so it is only fetched while signed in.
 */
export function useChatStatus(enabled = true) {
  return useQuery({
    queryKey: CHAT_STATUS_QUERY_KEY,
    queryFn: fetchChatStatus,
    staleTime: 1000 * 60 * 5,
    retry: false,
    enabled,
  });
}

/**
 * Gets the signed-in user's conversations, a page at a time and newest first.
 */
export function useChatConversations() {
  return useInfiniteQuery({
    queryKey: CHAT_CONVERSATIONS_QUERY_KEY,
    queryFn: ({ pageParam }) => fetchChatConversations(pageParam),
    initialPageParam: 1,
    getNextPageParam: lastPage =>
      lastPage.metadata.page < lastPage.metadata.totalPages ? lastPage.metadata.page + 1 : undefined,
  });
}
