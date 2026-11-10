import { AuthMeResponseSchema } from "@ssr/common/schemas/response/auth/me";
import { Elysia } from "elysia";
import { authPlugin } from "../../plugins/auth.plugin";
import { AuthConnectionsRepository } from "../../repositories/auth-connections.repository";

export default function userController(app: Elysia) {
  return app.use(authPlugin).get(
    "/me",
    {
      auth: true,
      tags: ["User"],
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
  );
}
