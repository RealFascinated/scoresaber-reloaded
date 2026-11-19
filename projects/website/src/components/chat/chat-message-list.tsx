"use client";

import type { ChatDisplayMessage } from "@/components/chat/chat-display";
import ChatMessageItem from "@/components/chat/chat-message";
import { Button } from "@/components/ui/button";
import { SharedIcons } from "@/shared-icons";
import type { ChatStatus } from "ai";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type ChatMessageListProps = {
  messages: ChatDisplayMessage[];
  durations: Record<string, number>;
  startedAt: number | null;
  status: ChatStatus;
  error: Error | undefined;
  historyFailed: boolean;
  onRetry: () => void;
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
  onReloadHistory,
}: ChatMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
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
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    if (distanceFromBottom < 240) {
      element.scrollTo({ top: element.scrollHeight });
    }
  }, [messages, status]);

  const handleScroll = () => {
    const element = scrollRef.current;
    if (element === null) {
      return;
    }
    setIsAwayFromBottom(element.scrollHeight - element.scrollTop - element.clientHeight > 240);
  };

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto scroll-smooth px-4 pt-6 pb-10 motion-reduce:scroll-auto"
      >
        {historyFailed ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">This chat could not be loaded.</p>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={onReloadHistory}>
              <SharedIcons.ChatRetryIcon className="size-4" />
              <span>Try again</span>
            </Button>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
            {messages.map(message => (
              <ChatMessageItem
                key={message.id}
                message={message}
                timing={{
                  isActive: isBusy && message === lastMessage,
                  startedAt,
                  durationMs: durations[message.id] ?? message.workDurationMs,
                }}
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
