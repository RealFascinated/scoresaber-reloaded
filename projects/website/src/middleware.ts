import { type NextRequest, NextResponse } from "next/server";
import { isProduction } from "@ssr/common/utils/utils";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const playerId = request.cookies.get("playerId");
  const isDesktopClient = request.headers.get("User-Agent")?.includes("ScoreSaber Reloaded");

  // Handle desktop client redirect
  if (isDesktopClient) {
    if (request.nextUrl.pathname === "/" && playerId !== undefined) {
      return NextResponse.redirect(new URL(`/player/${playerId.value}`, request.url));
    }
  }

  // Log requests in production
  if (isProduction()) {
    console.log(
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
