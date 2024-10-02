"use client";

import ReactDOM from "react-dom";

export function PreloadResources() {
  ReactDOM.prefetchDNS("https://proxy.fascinated.cc");
  ReactDOM.prefetchDNS("https://scoresber.com");
  return undefined;
}
