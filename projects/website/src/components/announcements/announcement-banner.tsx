"use client";

import { Button } from "@/components/ui/button";
import { SharedIcons } from "@/shared-icons";
import { ReactNode, useState, useSyncExternalStore } from "react";

/**
 * Local storage key holding the ids of every announcement the user has closed.
 */
const DISMISSED_ANNOUNCEMENTS_KEY = "dismissed-announcements";

function getDismissedIds(): string[] {
  try {
    const dismissedIds: string[] = JSON.parse(localStorage.getItem(DISMISSED_ANNOUNCEMENTS_KEY) ?? "[]");
    return Array.isArray(dismissedIds) ? dismissedIds : [];
  } catch {
    // Broken storage contents should never break the page.
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
  // The dismissed announcements are only known on the client, so nothing is
  // rendered on the server and the banner mounts once the id was read.
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
    <div className="border-primary/30 bg-primary/10 flex w-full items-center justify-center gap-3 border-b px-3 py-2">
      <p className="flex items-center justify-center gap-2 text-center text-sm">
        <SharedIcons.AnnouncementIcon className="text-primary size-4 shrink-0" />
        <span className="text-balance">{children}</span>
      </p>
      <Button
        aria-label="Close announcement"
        className="text-muted-foreground hover:text-foreground size-7 shrink-0"
        onClick={close}
        size="icon"
        variant="ghost"
      >
        <SharedIcons.AnnouncementCloseIcon className="size-4" />
      </Button>
    </div>
  );
}
