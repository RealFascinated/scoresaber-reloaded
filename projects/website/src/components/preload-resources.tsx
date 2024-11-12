"use client";

import ReactDOM from "react-dom";

export function PreloadResources() {
  ReactDOM.prefetchDNS("https://proxy.fascinated.cc");
  ReactDOM.prefetchDNS("https://analytics.fascinated.cc");
  ReactDOM.prefetchDNS("https://cdn.scoresaber.com");
  return undefined;
}
