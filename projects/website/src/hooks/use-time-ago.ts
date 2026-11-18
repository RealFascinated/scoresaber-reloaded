import { timeAgo } from "@ssr/common/utils/time-utils";
import { useCallback, useSyncExternalStore } from "react";

const FAST_TICK_MS = 1000;
const FAST_TICK_MAX_AGE_MS = 60 * 60 * 1000;
const SLOW_TICK_MS = 60 * 1000;

type Ticker = {
  subscribe: (listener: () => void) => () => void;
};

function createTicker(intervalMs: number) {
  const listeners = new Set<() => void>();
  let timer: ReturnType<typeof setInterval> | undefined;

  return {
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      timer ??= setInterval(() => {
        for (const subscriber of listeners) {
          subscriber();
        }
      }, intervalMs);

      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && timer !== undefined) {
          clearInterval(timer);
          timer = undefined;
        }
      };
    },
  } satisfies Ticker;
}

const fastTicker = createTicker(FAST_TICK_MS);
const slowTicker = createTicker(SLOW_TICK_MS);

/**
 * Gets how long ago a timestamp was ("5m 3s ago"), kept current without a timer per component.
 */
export function useTimeAgo(timestamp: Date | string | number) {
  const time = new Date(timestamp).getTime();

  const subscribe = useCallback(
    (listener: () => void) => {
      const ticker = Date.now() - time < FAST_TICK_MAX_AGE_MS ? fastTicker : slowTicker;
      return ticker.subscribe(listener);
    },
    [time]
  );
  const getSnapshot = () => timeAgo(new Date(time));

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
