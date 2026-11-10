import { UserPreferencesPatchSchema, UserPreferencesSchema } from "@ssr/common/schemas/user/preferences";
import { Elysia } from "elysia";
import { authPlugin } from "../../plugins/auth.plugin";
import { UserPreferencesRepository } from "../../repositories/user-preferences.repository";

const PRIVATE_NO_STORE = "private, no-store";

export default function userPreferencesController(app: Elysia) {
  return app
    .use(authPlugin)
    .get(
      "/user/preferences",
      {
        auth: true,
        tags: ["User"],
        response: UserPreferencesSchema,
        detail: { description: "Fetch the preferences of the signed-in user" },
      },
      async ({ user, set }) => {
        set.headers["cache-control"] = PRIVATE_NO_STORE;
        return UserPreferencesRepository.get(user.id);
      }
    )
    .patch(
      "/user/preferences",
      {
        auth: true,
        tags: ["User"],
        body: UserPreferencesPatchSchema,
        response: UserPreferencesSchema,
        detail: {
          description: "Replace one or more preferences of the signed-in user, returns all preferences",
        },
      },
      async ({ user, body, set }) => {
        set.headers["cache-control"] = PRIVATE_NO_STORE;
        return UserPreferencesRepository.patch(user.id, body);
      }
    );
}
