"use client";

import type { ChatDisplayMessage } from "@/components/chat/chat-display";
import { ChatEntityProvider } from "@/components/chat/chat-entity-cards";
import { buildChatEntityIndex } from "@/components/chat/chat-entity-index";
import ChatMessageItem from "@/components/chat/chat-message";
import { Button } from "@/components/ui/button";
import { SharedIcons } from "@/shared-icons";
import type { ChatStatus } from "ai";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

const NEAR_BOTTOM_PX = 240;

function countToolOutputs(messages: ChatDisplayMessage[]) {
  let count = 0;
  for (const message of messages) {
    for (const part of message.parts) {
      if (part.kind === "tool" && part.output !== undefined) {
        count++;
      }
    }
  }
  return count;
}

type ChatMessageListProps = {
  messages: ChatDisplayMessage[];
  durations: Record<string, number>;
  startedAt: number | null;
  status: ChatStatus;
  error: Error | undefined;
  historyFailed: boolean;
  onRetry: () => void;
  onRegenerate?: () => void;
  onReloadHistory: () => void;
};

/**
 * The scrolling message pane, including the empty, streaming and error states.
 */
export default function ChatMessageList({
  messages,
  durations,
  startedAt,
  status,
  error,
  historyFailed,
  onRetry,
  onRegenerate,
  onReloadHistory,
}: ChatMessageListProps) {
  const outputCount = countToolOutputs(messages);
  const entityIndex = useMemo(() => buildChatEntityIndex(messages), [outputCount]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isPinnedRef = useRef(true);
  const lastUserIdRef = useRef<string | undefined>(undefined);
  const [isAwayFromBottom, setIsAwayFromBottom] = useState(false);
  const isBusy = status === "submitted" || status === "streaming";
  const lastMessage = messages[messages.length - 1];
  const showThinking =
    status === "submitted" ||
    (status === "streaming" &&
      (lastMessage === undefined || lastMessage.role !== "assistant" || lastMessage.parts.length === 0));

  useEffect(() => {
    const element = scrollRef.current;
    if (element === null) {
      return;
    }
    const lastUserId = messages.findLast(message => message.role === "user")?.id;
    const isNewUserMessage = lastUserId !== undefined && lastUserId !== lastUserIdRef.current;
    lastUserIdRef.current = lastUserId;
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    if ((isNewUserMessage && lastMessage?.role === "user") || distanceFromBottom < NEAR_BOTTOM_PX) {
      isPinnedRef.current = true;
      element.scrollTo({ top: element.scrollHeight });
    }
  }, [messages, status, lastMessage?.role]);

  useEffect(() => {
    const content = contentRef.current;
    const element = scrollRef.current;
    if (content === null || element === null) {
      return;
    }
    const observer = new ResizeObserver(() => {
      if (isPinnedRef.current) {
        element.scrollTo({ top: element.scrollHeight });
      }
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [historyFailed]);

  const handleScroll = () => {
    const element = scrollRef.current;
    if (element === null) {
      return;
    }
    const isAway = element.scrollHeight - element.scrollTop - element.clientHeight > NEAR_BOTTOM_PX;
    isPinnedRef.current = !isAway;
    setIsAwayFromBottom(isAway);
  };

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={scrollRef} onScroll={handleScroll} className="h-full overflow-y-auto px-4 pt-6 pb-10">
        {historyFailed ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">This chat could not be loaded.</p>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={onReloadHistory}>
              <SharedIcons.ChatRetryIcon className="size-4" />
              <span>Try again</span>
            </Button>
          </div>
        ) : (
          <ChatEntityProvider value={entityIndex}>
            <div ref={contentRef} className="mx-auto flex w-full max-w-3xl flex-col gap-5">
              {messages.map(message => (
                <ChatMessageItem
                  key={message.id}
                  message={message}
                  isActive={isBusy && message === lastMessage}
                  startedAt={isBusy && message === lastMessage ? startedAt : null}
                  durationMs={durations[message.id] ?? message.workDurationMs}
                  onRegenerate={message === lastMessage && !isBusy ? onRegenerate : undefined}
                />
              ))}
              {showThinking && (
                <output className="flex items-center gap-3" aria-label="Thinking">
                  <Image
                    width={28}
                    height={28}
                    className="size-7 shrink-0 rounded-full border border-border/60 bg-secondary p-1"
                    src="/assets/logos/scoresaber.png"
                    alt="ScoreSaber Logo"
                  />
                  <div className="flex items-center gap-1">
                    {[0, 150, 300].map(delay => (
                      <span
                        key={delay}
                        style={{ animationDelay: `${delay}ms` }}
                        className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 motion-reduce:animate-pulse"
                      />
                    ))}
                  </div>
                </output>
              )}
              {error !== undefined && (
                <div className="flex flex-col items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
                  <div className="flex items-center gap-2 text-destructive">
                    <SharedIcons.WarningAlertIcon className="size-4 shrink-0" />
                    <span>
                      {error.message === "" ? "Something went wrong, please try again." : error.message}
                    </span>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={onRetry}>
                    <SharedIcons.ChatRetryIcon className="size-4" />
                    <span>Try again</span>
                  </Button>
                </div>
              )}
            </div>
          </ChatEntityProvider>
        )}
      </div>
      {isAwayFromBottom && !historyFailed && (
        <Button
          size="icon"
          variant="outline"
          aria-label="Scroll to the latest message"
          className="absolute bottom-3 left-1/2 size-9 -translate-x-1/2 rounded-full bg-card shadow-md duration-200 animate-in fade-in motion-reduce:animate-none"
          onClick={() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })}
        >
          <SharedIcons.ChatScrollDownIcon className="size-4" />
        </Button>
      )}
    </div>
  );
}
