import { Session } from "@ssr/common/auth/auth";
import type { User } from "better-auth/types";
import type { Context } from "elysia";

export type UserSessionContext = Context & {
  user: User;
  session: Session;
};
