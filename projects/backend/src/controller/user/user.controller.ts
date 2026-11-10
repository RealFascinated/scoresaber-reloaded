import { AuthMeResponseSchema } from "@ssr/common/schemas/response/auth/me";
import { Elysia } from "elysia";
import { authPlugin } from "../../plugins/auth.plugin";
import { UserService } from "../../service/user/user.service";

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
    async ({ user }) => UserService.getMe(user)
  );
}
