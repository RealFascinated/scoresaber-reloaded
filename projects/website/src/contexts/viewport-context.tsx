"use client";

import { useSyncExternalStore } from "react";

// Tailwind breakpoints matching the project's theme (used by useIsMobile max-width queries)
const Breakpoint = {
  xxs: 320,
  xs: 475,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export type BreakpointKey = keyof typeof Breakpoint;

function maxWidthQuery(px: number): string {
  return `(max-width: ${px}px)`;
}

function subscribeMaxWidth(px: number, onStoreChange: () => void): () => void {
  const mq = window.matchMedia(maxWidthQuery(px));
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getMaxWidthMatches(px: number): boolean {
  return window.matchMedia(maxWidthQuery(px)).matches;
}

/**
 * True when the viewport width is at or below the given Tailwind breakpoint (same as the former width <= Breakpoint[k] check).
 * Uses matchMedia so we only re-render when crossing the boundary, not on every resize pixel.
 */
export function useIsMobile(breakpoint: BreakpointKey = "md"): boolean {
  const maxPx = Breakpoint[breakpoint];

  return useSyncExternalStore(
    onStoreChange => subscribeMaxWidth(maxPx, onStoreChange),
    () => getMaxWidthMatches(maxPx),
    // SSR: previous ViewportProvider used width 0 → isMobile was always true for any positive breakpoint
    () => true
  );
}
