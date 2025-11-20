import { type NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const playerId = request.cookies.get("playerId");
  const websiteLanding = request.cookies.get("websiteLanding");

  // Handle home redirect if they have claimed a player
  if (request.nextUrl.pathname === "/" && !!playerId) {
    // If they have a player and prefer the landing page, stay on landing
    if (websiteLanding?.value === "landing") {
      return NextResponse.next();
    }
    // Otherwise redirect to player home
    return NextResponse.redirect(new URL("/home", request.url));
  }

  // Handle player home redirect if they don't have a player claimed
  if (request.nextUrl.pathname.startsWith("/home") && !playerId) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Log requests in production
  if (process.env.NEXT_PUBLIC_APP_ENV === "production") {
    console.log(`${request.method} ${request.nextUrl.pathname}${request.nextUrl.search}`);
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
