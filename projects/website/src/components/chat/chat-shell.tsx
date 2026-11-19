"use client";

import { chatMessagesUrl, createChatConversation, fetchChatConversation } from "@/common/chat/chat-api";
import { getUserMessageText, toDisplayMessage, toDisplayStreamMessage } from "@/components/chat/chat-display";
import ChatEmptyState from "@/components/chat/chat-empty-state";
import ChatInput from "@/components/chat/chat-input";
import ChatMessageList from "@/components/chat/chat-message-list";
import { CHAT_CONVERSATIONS_QUERY_KEY, useChatConversations } from "@/components/chat/chat-queries";
import ChatSidebar from "@/components/chat/chat-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useChat } from "@ai-sdk/react";
import { CHAT_ROUTE } from "@ssr/common/api-routes";
import type { ChatMessage } from "@ssr/common/schemas/chat/chat-message";
import { useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport } from "ai";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const TITLE_REFRESH_DELAYS_MS = [2000, 5000];

type ChatShellProps = {
  conversationId: string | null;
  initialMessages?: ChatMessage[];
};

/**
 * The whole chat app: the sidebar of conversations, the message column and the input.
 *
 * A new chat has no conversation until the first message is sent; the conversation is created then and the
 * address is updated without a navigation, so the reply keeps streaming.
 */
export default function ChatShell({ conversationId: serverConversationId, initialMessages }: ChatShellProps) {
  const queryClient = useQueryClient();
  const [conversationId, setConversationId] = useState(serverConversationId);
  const [history, setHistory] = useState<ChatMessage[]>(initialMessages ?? []);
  const [historyFailed, setHistoryFailed] = useState(
    serverConversationId !== null && initialMessages === undefined
  );

  const startConversation = useCallback(async () => {
    const conversation = await createChatConversation();
    setConversationId(conversation.id);
    window.history.replaceState(null, "", `${CHAT_ROUTE}/${conversation.id}`);
    await queryClient.invalidateQueries({ queryKey: CHAT_CONVERSATIONS_QUERY_KEY });
    return conversation.id;
  }, [queryClient]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        credentials: "include",
        prepareSendMessagesRequest: async ({ messages }) => {
          const lastUserMessage = messages.findLast(message => message.role === "user");
          if (lastUserMessage === undefined) {
            throw new Error("There is no message to send");
          }
          const text = getUserMessageText(lastUserMessage);
          if (text === "") {
            throw new Error("The message is empty");
          }
          const id = conversationId ?? (await startConversation());
          return {
            api: chatMessagesUrl(id),
            credentials: "include",
            body: { id: lastUserMessage.id, text },
          };
        },
      }),
    [conversationId, startConversation]
  );

  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const startedAtRef = useRef<number | null>(null);

  const markStarted = useCallback(() => {
    const now = Date.now();
    startedAtRef.current = now;
    setStartedAt(now);
  }, []);

  const { messages, status, error, sendMessage, stop, regenerate, clearError } = useChat({
    transport,
    onFinish: ({ message }) => {
      const started = startedAtRef.current;
      startedAtRef.current = null;
      setStartedAt(null);
      if (started !== null && message.role === "assistant") {
        const duration = Date.now() - started;
        setDurations(previous => ({ ...previous, [message.id]: duration }));
      }
      void queryClient.invalidateQueries({ queryKey: CHAT_CONVERSATIONS_QUERY_KEY });
      for (const delay of TITLE_REFRESH_DELAYS_MS) {
        setTimeout(() => {
          void queryClient.invalidateQueries({ queryKey: CHAT_CONVERSATIONS_QUERY_KEY });
        }, delay);
      }
    },
  });

  const conversations = useChatConversations();
  const activeConversation = conversations.data?.pages
    .flatMap(page => page.items)
    .find(conversation => conversation.id === conversationId);
  const title = activeConversation?.title ?? "New chat";

  const isBusy = status === "submitted" || status === "streaming";

  const displayMessages = useMemo(
    () => [...history.map(toDisplayMessage), ...messages.map(toDisplayStreamMessage)],
    [history, messages]
  );

  const isEmptyChat = displayMessages.length === 0 && !isBusy && error === undefined && !historyFailed;

  const handleSend = useCallback(
    (text: string) => {
      if (text.trim() === "") {
        return;
      }
      clearError();
      markStarted();
      void sendMessage({ text });
    },
    [clearError, markStarted, sendMessage]
  );

  const handleRetry = useCallback(() => {
    clearError();
    markStarted();
    void regenerate();
  }, [clearError, markStarted, regenerate]);

  const handleReloadHistory = useCallback(() => {
    if (conversationId === null) {
      return;
    }
    setHistoryFailed(false);
    fetchChatConversation(conversationId)
      .then(conversation => setHistory(conversation.messages))
      .catch(reloadError => {
        setHistoryFailed(true);
        toast.error(reloadError instanceof Error ? reloadError.message : "Failed to load the chat");
      });
  }, [conversationId]);

  return (
    <SidebarProvider defaultOpen className="h-dvh min-h-0">
      <ChatSidebar activeConversationId={conversationId} />
      <SidebarInset className="h-dvh min-h-0 min-w-0 overflow-hidden bg-background">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border/40 px-3">
          <SidebarTrigger className="md:hidden md:group-has-data-[state=collapsed]/sidebar-wrapper:inline-flex" />
          <h1 className="min-w-0 flex-1 truncate text-sm font-medium text-muted-foreground">{title}</h1>
        </div>
        {isEmptyChat ? (
          <ChatEmptyState isBusy={isBusy} onSend={handleSend} onStop={stop} />
        ) : (
          <>
            <ChatMessageList
              messages={displayMessages}
              durations={durations}
              startedAt={startedAt}
              status={status}
              error={error}
              historyFailed={historyFailed}
              onRetry={handleRetry}
              onReloadHistory={handleReloadHistory}
            />
            {!historyFailed && <ChatInput isBusy={isBusy} onSend={handleSend} onStop={stop} />}
          </>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
