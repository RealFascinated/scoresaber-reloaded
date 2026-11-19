"use client";

import { Button } from "@/components/ui/button";
import { SharedIcons } from "@/shared-icons";
import { CHAT_MESSAGE_MAX_LENGTH } from "@ssr/common/schemas/chat/chat-message";
import { useEffect, useRef, useState } from "react";

type ChatInputProps = {
  isBusy: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  variant?: "dock" | "hero";
};

/**
 * The message box. Enter sends, Shift+Enter adds a line, and while a reply streams the send button becomes stop.
 */
export default function ChatInput({ isBusy, onSend, onStop, variant = "dock" }: ChatInputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea === null) {
      return;
    }
    textarea.focus();

    const INTERACTIVE_SELECTOR = "button, a, input, textarea, select, [contenteditable], [role]";

    const isTypingElsewhere = (target: EventTarget | null) => {
      const active = document.activeElement;
      if (active instanceof Element && active.closest(INTERACTIVE_SELECTOR) !== null) {
        return true;
      }
      if (target instanceof Element && target.closest(INTERACTIVE_SELECTOR) !== null) {
        return true;
      }
      return document.querySelector('[role="dialog"], [role="alertdialog"]') !== null;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.isComposing ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.key.length !== 1 ||
        (window.getSelection()?.toString() ?? "") !== "" ||
        isTypingElsewhere(event.target)
      ) {
        return;
      }
      textarea.focus();
    };

    const handlePaste = (event: ClipboardEvent) => {
      if (!isTypingElsewhere(event.target)) {
        textarea.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("paste", handlePaste);
    };
  }, []);

  useEffect(() => {
    const element = textareaRef.current;
    if (element === null) {
      return;
    }
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 192)}px`;
  }, [text]);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (trimmed === "" || isBusy) {
      return;
    }
    onSend(trimmed);
    setText("");
  };

  const isEmpty = text.trim() === "";

  return (
    <div className={variant === "hero" ? "relative shrink-0" : "relative shrink-0 px-4 pb-4"}>
      {variant === "dock" && (
        <div className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-linear-to-t from-background to-transparent" />
      )}
      <div className="group/input mx-auto w-full max-w-3xl">
        <div className="flex w-full items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-lg">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={event => setText(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSubmit();
              }
            }}
            rows={1}
            maxLength={CHAT_MESSAGE_MAX_LENGTH}
            placeholder="Ask about a player, a map or your scores…"
            aria-label="Message"
            className="max-h-52 min-h-10 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm outline-hidden placeholder:text-muted-foreground"
          />
          {isBusy ? (
            <Button
              type="button"
              size="icon"
              variant="primary"
              aria-label="Stop the reply"
              className="size-10 shrink-0 rounded-full"
              onClick={onStop}
            >
              <SharedIcons.StopChatStreamIcon className="size-4 fill-current" />
            </Button>
          ) : (
            <Button
              type="button"
              size="icon"
              variant="primary"
              aria-label="Send the message"
              disabled={isEmpty}
              className="size-10 shrink-0 rounded-full disabled:bg-primary/15 disabled:text-primary/70 disabled:opacity-100"
              onClick={handleSubmit}
            >
              <SharedIcons.SendChatMessageIcon className="size-5" strokeWidth={2.5} />
            </Button>
          )}
        </div>
        <div className="mt-1.5 flex items-center justify-between px-2 text-[11px] text-muted-foreground">
          {text.length > CHAT_MESSAGE_MAX_LENGTH - 500 && (
            <span className="ml-auto tabular-nums">
              {text.length}/{CHAT_MESSAGE_MAX_LENGTH}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
