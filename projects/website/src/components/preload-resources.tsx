"use client";

import { env } from "@ssr/common/env";
import { CLIENT_PROXY } from "@ssr/common/shared-consts";
import ReactDOM from "react-dom";

export function PreloadResources() {
  ReactDOM.prefetchDNS(CLIENT_PROXY);
  ReactDOM.prefetchDNS(env.NEXT_PUBLIC_API_URL);
  ReactDOM.prefetchDNS(env.NEXT_PUBLIC_CDN_URL);
  return undefined;
}
