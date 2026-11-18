import * as React from "react";

const MOBILE_BREAKPOINT = 768;

let mobileQuery: MediaQueryList | undefined;
let isMobileCached: boolean | undefined;

function getMobileQuery() {
  mobileQuery ??= window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  return mobileQuery;
}

function subscribe(callback: () => void) {
  const mql = getMobileQuery();
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot() {
  if (isMobileCached === undefined) {
    const mql = getMobileQuery();
    isMobileCached = mql.matches;
    mql.addEventListener("change", event => {
      isMobileCached = event.matches;
    });
  }
  return isMobileCached;
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, () => false);
}
