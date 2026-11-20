"use client";

import { cn } from "@/common/utils";
import { useState } from "react";

type ChatTitleProps = {
  title: string | null;
  pending: boolean;
  className?: string;
};

/**
 * A chat's title. While the first title is being generated the placeholder shimmers, and when it
 * arrives it fades in from left to right.
 */
export function ChatTitle({ title, pending, className }: ChatTitleProps) {
  const [shown, setShown] = useState(title);
  const [arrived, setArrived] = useState(false);
  if (title !== shown) {
    setShown(title);
    setArrived(shown === null && title !== null);
  }

  return (
    <span
      className={cn(
        "truncate",
        pending && title === null && "title-shimmer",
        arrived && "title-reveal",
        className
      )}
      onAnimationEnd={() => setArrived(false)}
    >
      {title ?? "New chat"}
    </span>
  );
}
