import { Elysia } from "elysia";
import { auth } from "../auth/auth";

/**
 * Exposes the Better Auth session to routes through macros.
 *
 * - `auth: true` requires a signed-in user (401 otherwise) and adds `user` and `session` to the context.
 * - `optionalAuth: true` never rejects, `user` and `session` are `null` for anonymous requests.
 *
 * The routes have to `.use(authPlugin)` to use the macros.
 */
export const authPlugin = new Elysia({ name: "auth-plugin" }).macro({
  auth: {
    async derive({ request, status }) {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) {
        return status(401, { statusCode: 401, message: "Unauthorized" });
      }

      return { user: session.user, session: session.session };
    },
  },
  optionalAuth: {
    async derive({ request }) {
      const session = await auth.api.getSession({ headers: request.headers });
      return { user: session?.user ?? null, session: session?.session ?? null };
    },
  },
});
