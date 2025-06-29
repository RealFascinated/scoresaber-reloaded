import { auth, Session } from "@ssr/common/auth/auth";
import type { Context } from "elysia";

export type UserSessionContext = Context & {
  user: typeof auth.$Infer.Session.user;
  session: Session;
};
