import { AuthMeResponseSchema } from "@ssr/common/schemas/response/auth/me";
import { Elysia } from "elysia";
import { AUTH_BASE_PATH, auth } from "../../auth/auth";
import { authPlugin } from "../../plugins/auth.plugin";
import { AuthConnectionsRepository } from "../../repositories/auth-connections.repository";

export default function authController(app: Elysia) {
  return (
    app
      .use(authPlugin)
      // Better Auth owns everything under /auth (sign-in, OAuth callbacks, session, sign-out)
      .all(
        `${AUTH_BASE_PATH}/*`,
        {
          tags: ["Auth"],
          detail: {
            description: "Better Auth routes (Steam sign-in, session, sign-out)",
          },
        },
        ({ request }) => auth.handler(request)
      )
      .get(
        "/me",
        {
          auth: true,
          tags: ["Auth"],
          response: AuthMeResponseSchema,
          detail: {
            description: "Fetch the signed-in user",
          },
        },
        async ({ user }) => ({
          id: user.id,
          name: user.name,
          image: user.image ?? null,
          playerId: user.playerId ?? null,
          connections: await AuthConnectionsRepository.getByUserId(user.id),
        })
      )
  );
}
