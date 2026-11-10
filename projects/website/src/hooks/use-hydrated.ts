import { useSyncExternalStore } from "react";

const subscribeNothing = () => () => {};

/**
 * False while the page is rendered on the server and during hydration, true once the client has taken over.
 * Used to hold back images that are not needed for the first paint so they do not compete with the scripts
 * for bandwidth on a slow connection.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false
  );
}
