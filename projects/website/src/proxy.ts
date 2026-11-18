import { getServerSession } from "@/common/auth/session-server";
import { WebsiteLanding } from "@ssr/common/schemas/user/website-landing";
import { type NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    const session = await getServerSession(request.headers.get("cookie") ?? "");

    if (session.status === "signed-in" && session.me.playerId) {
      const { websiteLanding } = session.preferences;
      if (websiteLanding === WebsiteLanding.PLAYER_HOME) {
        return NextResponse.redirect(new URL("/home", request.url));
      }
      if (websiteLanding === WebsiteLanding.PLAYER_PAGE) {
        return NextResponse.redirect(new URL(`/player/${session.me.playerId}`, request.url));
      }
      return NextResponse.next();
    }
  }

  if (process.env.NEXT_PUBLIC_APP_ENV === "production") {
    console.log(`${request.method} ${pathname}${request.nextUrl.search}`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|assets/|backgrounds/|manifest/).*)"],
};
