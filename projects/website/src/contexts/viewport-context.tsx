"use client";

import { createContext, ReactNode, useContext, useMemo, useSyncExternalStore } from "react";

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

function createBreakpointStore(breakpoint: BreakpointKey) {
  const listeners = new Set<() => void>();
  let query: MediaQueryList | undefined;
  let matches = false;

  function ensureQuery() {
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
    subscribe: (onStoreChange: () => void) => {
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

const getServerSnapshotMobile = () => true;
const getServerSnapshotDesktop = () => false;

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
export function useIsMobile(breakpoint: BreakpointKey = "md") {
  const store = breakpointStores[breakpoint];
  const serverDevice = useContext(ServerDeviceContext);

  const getServerSnapshot =
    breakpoint === "md" && serverDevice?.isPhone === false
      ? getServerSnapshotDesktop
      : getServerSnapshotMobile;

  return useSyncExternalStore(store.subscribe, store.getSnapshot, getServerSnapshot);
}
