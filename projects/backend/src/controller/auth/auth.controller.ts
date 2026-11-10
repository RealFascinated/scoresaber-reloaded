import { AUTH_ROUTE } from "@ssr/common/api-routes";
import { Elysia } from "elysia";
import { auth } from "../../auth/auth";

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
        ({ request }) => auth.handler(request)
      )
  );
}
