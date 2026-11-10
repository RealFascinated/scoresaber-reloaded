import { getServerSession } from "@/common/auth/session-server";
import { WebsiteLanding } from "@ssr/common/schemas/user/website-landing";
import { type NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The session is the only source of who is signed in, so only the pages that depend on it
  // pay for asking the backend
  if (pathname === "/" || pathname.startsWith("/home")) {
    const session = await getServerSession(request.headers.get("cookie") ?? "");

    // Signed-in visitors land where they asked to
    if (pathname === "/" && session.status === "signed-in" && session.me.playerId) {
      const { websiteLanding } = session.preferences;
      if (websiteLanding === WebsiteLanding.PLAYER_HOME) {
        return NextResponse.redirect(new URL("/home", request.url));
      }
      if (websiteLanding === WebsiteLanding.PLAYER_PAGE) {
        return NextResponse.redirect(new URL(`/player/${session.me.playerId}`, request.url));
      }
      return NextResponse.next();
    }

    // The player home needs a signed-in player. Only a definite "not signed in" redirects,
    // an unreachable backend must not lock everyone out.
    if (pathname.startsWith("/home") && session.status === "anonymous") {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (process.env.NEXT_PUBLIC_APP_ENV === "production") {
    console.log(`${request.method} ${pathname}${request.nextUrl.search}`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - assets, backgrounds, manifest (static files in public/, nothing here applies to them)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|assets/|backgrounds/|manifest/).*)",
  ],
};
