"use client";

import { SharedIcons } from "@/shared-icons";
import { useEffect, useState } from "react";

const COPIED_RESET_MS = 1500;

const ICON_BUTTON_CLASS =
  "cursor-pointer text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:text-foreground";

/**
 * Icon-only copy and regenerate buttons under a finished answer, revealed on hover or focus and always visible on touch.
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
    <div className="flex items-center gap-3 opacity-0 transition-opacity group-hover/message:opacity-100 focus-within:opacity-100 pointer-coarse:opacity-100">
      <button
        type="button"
        aria-label={isCopied ? "Copied" : "Copy the answer"}
        className={ICON_BUTTON_CLASS}
        onClick={handleCopy}
      >
        {isCopied ? (
          <SharedIcons.ChatToolDoneIcon className="size-3.5 text-success" />
        ) : (
          <SharedIcons.ChatCopyIcon className="size-3.5" />
        )}
      </button>
      {onRegenerate !== undefined && (
        <button
          type="button"
          aria-label="Regenerate the answer"
          className={ICON_BUTTON_CLASS}
          onClick={onRegenerate}
        >
          <SharedIcons.ChatRetryIcon className="size-3.5" />
        </button>
      )}
    </div>
  );
}
