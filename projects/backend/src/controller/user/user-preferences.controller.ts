import { USER_PREFERENCES_ROUTE } from "@ssr/common/api-routes";
import { UserPreferencesPatchSchema, UserPreferencesSchema } from "@ssr/common/schemas/user/preferences";
import { Elysia } from "elysia";
import { authPlugin } from "../../plugins/auth.plugin";
import { UserPreferencesService } from "../../service/user/user-preferences.service";

const PRIVATE_NO_STORE = "private, no-store";

export default function userPreferencesController(app: Elysia) {
  return app
    .use(authPlugin)
    .get(
      USER_PREFERENCES_ROUTE,
      {
        auth: true,
        tags: ["User"],
        response: UserPreferencesSchema,
        detail: { description: "Fetch the preferences of the signed-in user" },
      },
      async ({ user, set }) => {
        set.headers["cache-control"] = PRIVATE_NO_STORE;
        return UserPreferencesService.get(user.id);
      }
    )
    .patch(
      USER_PREFERENCES_ROUTE,
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
        return UserPreferencesService.patch(user.id, body);
      }
    );
}
