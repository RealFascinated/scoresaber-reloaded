import { AUTH_ROUTE } from "@ssr/common/api-routes";
import { env } from "@ssr/common/env";
import { Elysia } from "elysia";
import { auth } from "../../auth/auth";

function withPublicOrigin(request: Request) {
  const url = new URL(request.url);
  const publicUrl = new URL(`${url.pathname}${url.search}`, env.NEXT_PUBLIC_API_URL);
  return new Request(publicUrl, request);
}

export default function authController(app: Elysia) {
  return app.all(
    `${AUTH_ROUTE}/*`,
    {
      tags: ["Auth"],
      detail: {
        description: "Better Auth routes (Steam sign-in, session, sign-out)",
      },
    },
    ({ request }) => auth.handler(withPublicOrigin(request))
  );
}
