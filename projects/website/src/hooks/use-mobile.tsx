import * as React from "react";

const MOBILE_BREAKPOINT = 768;

let mobileQuery: MediaQueryList | undefined;
let isMobileCached: boolean | undefined;

function getMobileQuery(): MediaQueryList {
  mobileQuery ??= window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  return mobileQuery;
}

function subscribe(callback: () => void) {
  const mql = getMobileQuery();
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

// useSyncExternalStore calls this on every render of every consumer. Reading window.innerWidth here
// forces a synchronous layout flush each time, so cache the media query result instead and keep it
// current from a single listener (registered here, before any subscriber's, so it is always fresh).
function getSnapshot(): boolean {
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
