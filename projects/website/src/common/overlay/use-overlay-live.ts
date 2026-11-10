"use client";

import { fetchOverlayContent, getOverlayEventsUrl } from "@/common/overlay/overlay-api";
import type { OverlayContent } from "@ssr/common/schemas/response/user/overlay";
import { useEffect, useState } from "react";

/** How often the overlay is polled when the event stream is not working. */
const FALLBACK_POLL_MS = 30_000;

/**
 * Keeps an overlay up to date: the server pushes layout changes through server-sent events, and the overlay
 * is polled slowly while the stream is down. `null` means the overlay was deleted.
 */
export function useOverlayLive(overlayId: string, initial: OverlayContent): OverlayContent | null {
  const [content, setContent] = useState<OverlayContent | null>(initial);

  useEffect(() => {
    let closed = false;

    const poll = async () => {
      try {
        const next = await fetchOverlayContent(overlayId);
        if (!closed) {
          setContent(current => (current && current.revision >= next.revision ? current : next));
        }
      } catch (error) {
        console.error("Failed to refresh the overlay", error);
      }
    };

    const pollTimer = setInterval(poll, FALLBACK_POLL_MS);
    const source = new EventSource(getOverlayEventsUrl(overlayId));
    source.addEventListener("layout", event => {
      const next = JSON.parse((event as MessageEvent<string>).data) as OverlayContent;
      setContent(current => (current && current.revision >= next.revision ? current : next));
    });
    source.addEventListener("deleted", () => setContent(null));

    return () => {
      closed = true;
      clearInterval(pollTimer);
      source.close();
    };
  }, [overlayId]);

  return content;
}
