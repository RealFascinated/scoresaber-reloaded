import { type NextRequest, NextResponse } from "next/server";
import { isProduction } from "@ssr/common/utils/utils";
import Logger from "@ssr/common/logger";

export function middleware(request: NextRequest) {
  const playerId = request.cookies.get("playerId");
  const isDesktopClient = request.headers.get("User-Agent")?.includes("ScoreSaber Reloaded");

  // Handle desktop client redirect
  if (isDesktopClient) {
    if (request.nextUrl.pathname === "/" && playerId !== undefined) {
      return NextResponse.redirect(new URL(`/player/${playerId.value}`, request.url));
    }
  }

  // Handle home redirect if they have claimed a player
  if (request.nextUrl.pathname === "/" && !!playerId) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  // Handle player home redirect if they don't have a player claimed
  if (request.nextUrl.pathname.startsWith("/home") && !playerId) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const response = NextResponse.next();

  // Log requests in production
  if (isProduction()) {
    Logger.info(
      ` ${isDesktopClient ? "[Desktop App] " : ""}${request.method} ${request.nextUrl.pathname}${request.nextUrl.search} ${response.status}`
    );
  }

  return response;
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
