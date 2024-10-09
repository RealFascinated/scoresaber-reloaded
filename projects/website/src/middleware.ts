import type { NextRequest } from "next/server";
import { isProduction } from "@ssr/common/utils/utils";

export function middleware(request: NextRequest) {
  // Log requests in production
  if (isProduction()) {
    console.log(` ${request.method} ${request.url}`);
  }
}
