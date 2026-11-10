import { timeAgo } from "@ssr/common/utils/time-utils";
import { useCallback, useSyncExternalStore } from "react";

/** timeAgo shows seconds only while a timestamp is under an hour old, so only those need a 1s tick. */
const FAST_TICK_MS = 1000;
const FAST_TICK_MAX_AGE_MS = 60 * 60 * 1000;
/** Older timestamps change at most once a minute (hours and up show no seconds). */
const SLOW_TICK_MS = 60 * 1000;

type Ticker = {
  subscribe: (listener: () => void) => () => void;
};

/**
 * One timer shared by every subscriber (a page lists dozens of scores, each used to own a 1s interval),
 * running only while something is subscribed.
 */
function createTicker(intervalMs: number): Ticker {
  const listeners = new Set<() => void>();
  let timer: ReturnType<typeof setInterval> | undefined;

  return {
    subscribe: listener => {
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
  };
}

const fastTicker = createTicker(FAST_TICK_MS);
const slowTicker = createTicker(SLOW_TICK_MS);

/**
 * Gets how long ago a timestamp was ("5m 3s ago"), kept current without a timer per component.
 */
export function useTimeAgo(timestamp: Date | string | number): string {
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
