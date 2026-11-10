import { AUTH_ROUTE } from "@ssr/common/api-routes";
import { env } from "@ssr/common/env";
import { Elysia } from "elysia";
import { auth } from "../../auth/auth";

/**
 * Rebuilds the request on the public API origin. Behind a reverse proxy the backend sees its own
 * internal origin (like `http://` instead of `https://`), but Better Auth checks the Steam
 * callback against the public `baseURL` and rejects it with `invalid_code` when they differ.
 */
function withPublicOrigin(request: Request): Request {
  const url = new URL(request.url);
  const publicUrl = new URL(`${url.pathname}${url.search}`, env.NEXT_PUBLIC_API_URL);
  return new Request(publicUrl, request);
}

export default function authController(app: Elysia) {
  return (
    app
      // Better Auth owns everything under /auth (sign-in, OAuth callbacks, session, sign-out)
      .all(
        `${AUTH_ROUTE}/*`,
        {
          tags: ["Auth"],
          detail: {
            description: "Better Auth routes (Steam sign-in, session, sign-out)",
          },
        },
        ({ request }) => auth.handler(withPublicOrigin(request))
      )
  );
}
