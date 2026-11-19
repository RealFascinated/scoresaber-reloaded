"use client";

import ChatInput from "@/components/chat/chat-input";
import { useMemo, useSyncExternalStore } from "react";

const SUGGESTED_PROMPTS = [
  "Show my highest pp plays",
  "How has my rank changed this month?",
  "What got ranked this week?",
  "Suggest maps to help me gain pp",
  "Make a playlist of maps I should try next",
  "How do I compare to the number one player?",
  "Find ranked maps around 7 stars",
  "How are the players I follow doing?",
  "How many medals do I have?",
  "Who's top of the global ranking?",
];

const PROMPTS_SHOWN = 3;
const NO_PROMPTS: string[] = [];

function subscribeNever() {
  return () => {};
}

function pickRandomPrompts() {
  const pool = [...SUGGESTED_PROMPTS];
  for (let index = pool.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }
  return pool.slice(0, PROMPTS_SHOWN);
}

type ChatEmptyStateProps = {
  isBusy: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
};

/**
 * A chat with no messages yet: a short greeting, the message box in the middle of the page and a few prompts to start from.
 */
export default function ChatEmptyState({ isBusy, onSend, onStop }: ChatEmptyStateProps) {
  const picked = useMemo(() => pickRandomPrompts(), []);
  const prompts = useSyncExternalStore(
    subscribeNever,
    () => picked,
    () => NO_PROMPTS
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-4 pb-16 duration-300 animate-in fade-in motion-reduce:animate-none">
      <h2 className="text-center text-3xl font-medium tracking-tight">What do you want to know?</h2>
      <div className="flex w-full flex-col gap-4">
        <ChatInput variant="hero" isBusy={isBusy} onSend={onSend} onStop={onStop} />
        <div className="mx-auto flex min-h-9 w-full max-w-3xl flex-wrap justify-center gap-2">
          {prompts.map(prompt => (
            <button
              key={prompt}
              type="button"
              onClick={() => onSend(prompt)}
              className="cursor-pointer rounded-full border border-border/60 px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:border-border hover:bg-secondary/50 hover:text-foreground"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
