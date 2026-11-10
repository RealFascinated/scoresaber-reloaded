"use client";

import type { OverlayData } from "@/common/overlay/overlay-data";
import { useEffect, useState } from "react";

/**
 * Gets the song time in seconds, smoothed between the messages of the game. The time keeps running
 * from the last message and stands still while the game is paused.
 *
 * @returns undefined when not in a song
 */
export function useSongTime(data: OverlayData): number | undefined {
  const { songTime, songTimeSyncedAt, paused } = data;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (songTime === undefined || paused) {
      return;
    }
    let frame = requestAnimationFrame(function tick() {
      setNow(Date.now());
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [songTime, songTimeSyncedAt, paused]);

  if (songTime === undefined) {
    return undefined;
  }
  if (paused || songTimeSyncedAt === undefined) {
    return songTime;
  }
  return songTime + Math.max(0, now - songTimeSyncedAt) / 1000;
}
