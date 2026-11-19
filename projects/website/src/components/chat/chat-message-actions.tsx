"use client";

import { Button } from "@/components/ui/button";
import { SharedIcons } from "@/shared-icons";
import { useEffect, useState } from "react";

const COPIED_RESET_MS = 1500;

/**
 * Ghost copy and regenerate buttons under a finished answer, revealed on hover or focus and always visible on touch.
 */
export default function ChatMessageActions({
  text,
  onRegenerate,
}: {
  text: string;
  onRegenerate?: () => void;
}) {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!isCopied) {
      return;
    }
    const timeout = setTimeout(() => setIsCopied(false), COPIED_RESET_MS);
    return () => clearTimeout(timeout);
  }, [isCopied]);

  const handleCopy = () => {
    navigator.clipboard
      .writeText(text)
      .then(() => setIsCopied(true))
      .catch(() => setIsCopied(false));
  };

  return (
    <div className="-ml-1.5 flex items-center gap-0.5 opacity-0 transition-opacity group-hover/message:opacity-100 focus-within:opacity-100 pointer-coarse:opacity-100">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label={isCopied ? "Copied" : "Copy the answer"}
        className="size-7 text-muted-foreground hover:text-foreground"
        onClick={handleCopy}
      >
        {isCopied ? (
          <SharedIcons.ChatToolDoneIcon className="size-3.5 text-success" />
        ) : (
          <SharedIcons.ChatCopyIcon className="size-3.5" />
        )}
      </Button>
      {onRegenerate !== undefined && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Regenerate the answer"
          className="size-7 text-muted-foreground hover:text-foreground"
          onClick={onRegenerate}
        >
          <SharedIcons.ChatRetryIcon className="size-3.5" />
        </Button>
      )}
    </div>
  );
}
