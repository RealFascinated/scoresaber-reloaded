"use client";

import { createContext, ReactNode, useContext, useMemo, useSyncExternalStore } from "react";

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

type BreakpointStore = {
  subscribe: (onStoreChange: () => void) => () => void;
  getSnapshot: () => boolean;
};

/**
 * One store per breakpoint, shared by every component that reads it. A page renders hundreds of
 * tooltips and rows that call useIsMobile, so each of them must not own a MediaQueryList, a listener and a
 * fresh subscribe function (which makes React re-subscribe on every render). Nothing touches `window`
 * until a store is first read on the client.
 */
function createBreakpointStore(breakpoint: BreakpointKey): BreakpointStore {
  const listeners = new Set<() => void>();
  let query: MediaQueryList | undefined;
  let matches = false;

  // Registered on first use, before any subscriber, so `matches` is always current when React reads it
  function ensureQuery(): void {
    if (query) {
      return;
    }
    query = window.matchMedia(`(max-width: ${Breakpoint[breakpoint]}px)`);
    matches = query.matches;
    query.addEventListener("change", event => {
      matches = event.matches;
      for (const listener of listeners) {
        listener();
      }
    });
  }

  return {
    subscribe: onStoreChange => {
      ensureQuery();
      listeners.add(onStoreChange);
      return () => {
        listeners.delete(onStoreChange);
      };
    },
    getSnapshot: () => {
      ensureQuery();
      return matches;
    },
  };
}

const breakpointStores = Object.fromEntries(
  (Object.keys(Breakpoint) as BreakpointKey[]).map(key => [key, createBreakpointStore(key)])
) as Record<BreakpointKey, BreakpointStore>;

// SSR: previous ViewportProvider used width 0 → isMobile was always true for any positive breakpoint
const getServerSnapshotMobile = () => true;
const getServerSnapshotDesktop = () => false;

/**
 * Whether the request came from a phone, as far as the server can tell (undefined when it can't).
 * The server never knows the viewport, so hydration assumes "mobile", and every desktop visitor then paid for
 * a second render of everything that branches on useIsMobile (tooltips on every score row, for one).
 * Telling the hook a desktop browser is asking lets it hydrate with the right value the first time.
 */
const ServerDeviceContext = createContext<{ isPhone: boolean } | undefined>(undefined);

export function ServerDeviceProvider({ isPhone, children }: { isPhone: boolean; children: ReactNode }) {
  const value = useMemo(() => ({ isPhone }), [isPhone]);

  return <ServerDeviceContext.Provider value={value}>{children}</ServerDeviceContext.Provider>;
}

/**
 * True when the viewport width is at or below the given Tailwind breakpoint (same as the former width <= Breakpoint[k] check).
 * Uses matchMedia so we only re-render when crossing the boundary, not on every resize pixel.
 *
 * Default breakpoint is md (768px).
 */
export function useIsMobile(breakpoint: BreakpointKey = "md"): boolean {
  const store = breakpointStores[breakpoint];
  const serverDevice = useContext(ServerDeviceContext);

  // Only the phone-sized breakpoint can be inferred from the device. A wrong guess just renders twice, as before.
  const getServerSnapshot =
    breakpoint === "md" && serverDevice?.isPhone === false
      ? getServerSnapshotDesktop
      : getServerSnapshotMobile;

  return useSyncExternalStore(store.subscribe, store.getSnapshot, getServerSnapshot);
}
