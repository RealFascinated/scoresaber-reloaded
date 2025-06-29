import { Context } from "elysia";
import { UserSessionContext } from "./user-session-context";

/**
 * Checks if the user is authenticated and has a session.
 *
 * @param context the context of the request.
 * @returns the user and session if the user is authenticated, otherwise a 401 status code.
 */
export function userAuthHandler(context: Context) {
  const { user, session } = context as UserSessionContext;
  if (!user || !session) {
    return context.status(401);
  }
}
