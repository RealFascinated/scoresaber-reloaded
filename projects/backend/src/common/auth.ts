import { auth } from "@ssr/common/auth/auth";
import { Context } from "elysia";

export const userMiddleware = async (context: Context) => {
  const session = await auth.api.getSession({ headers: context.request.headers });

  if (!session) {
    return {
      user: null,
      session: null,
    };
  }

  return {
    user: session.user,
    session: session.session,
  };
};
