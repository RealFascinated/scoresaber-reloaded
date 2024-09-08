import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cookies = request.cookies;

  const playerIdCookie = cookies.get("playerId");
  if (pathname == "/") {
    if (playerIdCookie) {
      return NextResponse.redirect(new URL(`/player/${playerIdCookie.value}/top/1`, request.url));
    } else {
      return NextResponse.redirect(new URL("/search", request.url));
    }
  }
}

export const config = {
  matcher: "/((?!api|_next/static|_next/image|favicon.ico).*)",
};
