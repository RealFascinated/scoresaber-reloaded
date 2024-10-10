import { NextResponse, type NextRequest } from "next/server";
import { isProduction } from "@ssr/common/utils/utils";

export function middleware(request: NextRequest) {
  const before = Date.now();
  const response = NextResponse.next();
  const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || request.ip;

  // Log requests in production
  if (isProduction()) {
    console.log(
      ` ${ip} | ${request.method} ${request.nextUrl.pathname} ${response.status} in ${(Date.now() - before).toFixed(0)}ms`
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
