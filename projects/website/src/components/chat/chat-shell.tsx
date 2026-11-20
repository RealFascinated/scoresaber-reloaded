"use client";

import { chatMessagesUrl, createChatConversation, fetchChatConversation } from "@/common/chat/chat-api";
import ChatContextUsage from "@/components/chat/chat-context-usage";
import { getUserMessageText, toDisplayMessage, toDisplayStreamMessage } from "@/components/chat/chat-display";
import ChatEmptyState from "@/components/chat/chat-empty-state";
import ChatInput from "@/components/chat/chat-input";
import ChatMessageList from "@/components/chat/chat-message-list";
import {
  CHAT_CONTEXT_QUERY_KEY,
  CHAT_CONVERSATIONS_QUERY_KEY,
  useChatContextUsage,
  useChatConversations,
} from "@/components/chat/chat-queries";
import ChatSidebar from "@/components/chat/chat-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useChat } from "@ai-sdk/react";
import { CHAT_ROUTE } from "@ssr/common/api-routes";
import type { ChatMessage } from "@ssr/common/schemas/chat/chat-message";
import { useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport, type UIMessage } from "ai";
import { usePathname } from "next/navigation";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { toast } from "sonner";

const TITLE_REFRESH_DELAYS_MS = [2000, 5000];

type ChatShellProps = {
  conversationId: string | null;
  initialMessages?: ChatMessage[];
  initialPrompt?: string;
};

const SIDEBAR_WIDTH_STORAGE_KEY = "chat-sidebar-width";
const SIDEBAR_MIN_WIDTH = 288;
const SIDEBAR_MAX_WIDTH = 560;
const SIDEBAR_DEFAULT_WIDTH = 288;

function clampSidebarWidth(width: number) {
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(width)));
}

const SIDEBAR_WIDTH_EVENT = "chat-sidebar-width-change";

function subscribeSidebarWidth(onChange: () => void) {
  window.addEventListener(SIDEBAR_WIDTH_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(SIDEBAR_WIDTH_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSidebarWidth() {
  const stored = Number(window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY));
  return Number.isFinite(stored) && stored > 0 ? clampSidebarWidth(stored) : SIDEBAR_DEFAULT_WIDTH;
}

const displayStreamCache = new WeakMap<UIMessage, ReturnType<typeof toDisplayStreamMessage>>();

function createIdStore(initial: string | null) {
  let current = initial;
  return {
    get: () => current,
    set: (id: string) => {
      current = id;
    },
  };
}

function toCachedDisplayStreamMessage(message: UIMessage) {
  const cached = displayStreamCache.get(message);
  if (cached !== undefined) {
    return cached;
  }
  const display = toDisplayStreamMessage(message);
  displayStreamCache.set(message, display);
  return display;
}

/**
 * The whole chat app: the sidebar of conversations, the message column and the input.
 *
 * A new chat has no conversation until the first message is sent; the conversation is created then and the
 * address is updated without a navigation, so the reply keeps streaming.
 */
export default function ChatShell(props: ChatShellProps) {
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);
  const [session, setSession] = useState(0);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    if (pathname === CHAT_ROUTE) {
      setSession(previous => previous + 1);
    }
  }
  return <ChatShellContent key={session} {...props} />;
}

function ChatShellContent({
  conversationId: serverConversationId,
  initialMessages,
  initialPrompt,
}: ChatShellProps) {
  const queryClient = useQueryClient();
  const sidebarWidth = useSyncExternalStore(
    subscribeSidebarWidth,
    getSidebarWidth,
    () => SIDEBAR_DEFAULT_WIDTH
  );
  const [conversationId, setConversationId] = useState(serverConversationId);

  const resizeSidebar = useCallback((width: number) => {
    const clamped = clampSidebarWidth(width);
    window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(clamped));
    window.dispatchEvent(new Event(SIDEBAR_WIDTH_EVENT));
  }, []);
  const [idStore] = useState(() => createIdStore(serverConversationId));
  const [history, setHistory] = useState<ChatMessage[]>(initialMessages ?? []);
  const [historyFailed, setHistoryFailed] = useState(
    serverConversationId !== null && initialMessages === undefined
  );

  const startConversation = useCallback(async () => {
    const conversation = await createChatConversation();
    idStore.set(conversation.id);
    setConversationId(conversation.id);
    window.history.replaceState(null, "", `${CHAT_ROUTE}/${conversation.id}`);
    await queryClient.invalidateQueries({ queryKey: CHAT_CONVERSATIONS_QUERY_KEY });
    return conversation.id;
  }, [queryClient]);

  const resolveConversationId = useCallback(
    async () => idStore.get() ?? (await startConversation()),
    [idStore, startConversation]
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        credentials: "include",
        prepareSendMessagesRequest: async ({ messages, trigger }) => {
          const lastUserMessage = messages.findLast(message => message.role === "user");
          if (lastUserMessage === undefined) {
            throw new Error("There is no message to send");
          }
          const text = getUserMessageText(lastUserMessage);
          if (text === "") {
            throw new Error("The message is empty");
          }
          const id = await resolveConversationId();
          return {
            api: chatMessagesUrl(id),
            credentials: "include",
            body: { id: lastUserMessage.id, text, regenerate: trigger === "regenerate-message" },
          };
        },
      }),
    [resolveConversationId]
  );

  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const startedAtRef = useRef<number | null>(null);
  const titleTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isSendingRef = useRef(false);

  useEffect(() => {
    const timeouts = titleTimeoutsRef.current;
    return () => {
      for (const timeout of timeouts) {
        clearTimeout(timeout);
      }
    };
  }, []);

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
      void queryClient.invalidateQueries({ queryKey: CHAT_CONTEXT_QUERY_KEY });
      for (const delay of TITLE_REFRESH_DELAYS_MS) {
        titleTimeoutsRef.current.push(
          setTimeout(() => {
            void queryClient.invalidateQueries({ queryKey: CHAT_CONVERSATIONS_QUERY_KEY });
          }, delay)
        );
      }
    },
  });

  const conversations = useChatConversations();
  const activeConversation = conversations.data?.pages
    .flatMap(page => page.items)
    .find(conversation => conversation.id === conversationId);
  const contextUsage = useChatContextUsage(conversationId);
  const title = activeConversation?.title ?? "New chat";

  const isBusy = status === "submitted" || status === "streaming";

  const historyDisplayMessages = useMemo(() => history.map(toDisplayMessage), [history]);
  const displayMessages = useMemo(
    () => [...historyDisplayMessages, ...messages.map(toCachedDisplayStreamMessage)],
    [historyDisplayMessages, messages]
  );

  const isEmptyChat = displayMessages.length === 0 && !isBusy && error === undefined && !historyFailed;

  const handleSend = useCallback(
    (text: string) => {
      if (text.trim() === "" || isBusy || isSendingRef.current) {
        return;
      }
      isSendingRef.current = true;
      clearError();
      markStarted();
      void sendMessage({ text }).finally(() => {
        isSendingRef.current = false;
      });
    },
    [clearError, isBusy, markStarted, sendMessage]
  );

  const initialPromptSentRef = useRef(false);
  useEffect(() => {
    if (initialPrompt === undefined || initialPromptSentRef.current) {
      return;
    }
    // WARNING: useChat stops its request on cleanup, so a send made synchronously is aborted by React Strict Mode's mount cycle in development
    const timeout = setTimeout(() => {
      initialPromptSentRef.current = true;
      handleSend(initialPrompt);
    }, 0);
    return () => clearTimeout(timeout);
  }, [handleSend, initialPrompt]);

  const handleRetry = useCallback(() => {
    clearError();
    markStarted();
    void regenerate();
  }, [clearError, markStarted, regenerate]);

  const canRegenerate = messages.length > 0 && messages[messages.length - 1].role === "assistant";

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
    <SidebarProvider
      defaultOpen
      className="h-dvh min-h-0"
      style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
    >
      <ChatSidebar activeConversationId={conversationId} onResize={resizeSidebar} />
      <SidebarInset className="h-dvh min-h-0 min-w-0 overflow-hidden bg-background">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border/40 px-3">
          <SidebarTrigger className="md:hidden md:group-has-data-[state=collapsed]/sidebar-wrapper:inline-flex" />
          <h1 className="min-w-0 flex-1 truncate text-sm font-medium text-muted-foreground">{title}</h1>
          {contextUsage.data && <ChatContextUsage usage={contextUsage.data} />}
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
              onRegenerate={canRegenerate ? handleRetry : undefined}
              onReloadHistory={handleReloadHistory}
            />
            {!historyFailed && <ChatInput isBusy={isBusy} onSend={handleSend} onStop={stop} />}
          </>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
