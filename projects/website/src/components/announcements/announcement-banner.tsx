"use client";

import { Button } from "@/components/ui/button";
import { SharedIcons } from "@/shared-icons";
import { ReactNode, useState, useSyncExternalStore } from "react";

const DISMISSED_ANNOUNCEMENTS_KEY = "dismissed-announcements";

function getDismissedIds() {
  try {
    const dismissedIds: string[] = JSON.parse(localStorage.getItem(DISMISSED_ANNOUNCEMENTS_KEY) ?? "[]");
    return Array.isArray(dismissedIds) ? dismissedIds : [];
  } catch {
    return [];
  }
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);

  return () => window.removeEventListener("storage", onStoreChange);
}

type AnnouncementBannerProps = {
  /**
   * Unique id of this announcement, used to remember that it was closed.
   */
  id: string;

  /**
   * The content of this announcement.
   */
  children: ReactNode;
};

export default function AnnouncementBanner({ id, children }: AnnouncementBannerProps) {
  const [closed, setClosed] = useState(false);
  const dismissed = useSyncExternalStore(
    subscribe,
    () => getDismissedIds().includes(id),
    () => true
  );

  if (closed || dismissed) {
    return null;
  }

  const close = () => {
    localStorage.setItem(DISMISSED_ANNOUNCEMENTS_KEY, JSON.stringify([...getDismissedIds(), id]));
    setClosed(true);
  };

  return (
    <div className="flex w-full items-center justify-center gap-2 border-b border-primary/30 bg-background/80 bg-linear-to-r from-primary/12 to-primary/12 px-3 py-1.5 backdrop-blur">
      <p className="flex min-w-0 items-center justify-center gap-2 text-center text-xs sm:text-sm">
        <SharedIcons.AnnouncementIcon className="hidden size-4 shrink-0 text-primary sm:block" />
        <span className="text-balance">{children}</span>
      </p>
      <Button
        aria-label="Close announcement"
        className="size-6 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={close}
        size="icon"
        variant="ghost"
      >
        <SharedIcons.AnnouncementCloseIcon className="size-4" />
      </Button>
    </div>
  );
}
