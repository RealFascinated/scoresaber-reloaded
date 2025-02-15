import Logger from "@ssr/common/logger";
import { isProduction } from "@ssr/common/utils/utils";
import { type NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const playerId = request.cookies.get("playerId");

  // Handle home redirect if they have claimed a player
  if (request.nextUrl.pathname === "/" && !!playerId) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  // Handle player home redirect if they don't have a player claimed
  if (request.nextUrl.pathname.startsWith("/home") && !playerId) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Log requests in production
  if (isProduction()) {
    Logger.info(`${request.method} ${request.nextUrl.pathname}${request.nextUrl.search}`);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
