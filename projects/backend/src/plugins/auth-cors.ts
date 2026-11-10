import { Elysia } from "elysia";
import { AUTH_TRUSTED_ORIGINS } from "../auth/auth";

/**
 * Allows credentialed (cookie) requests from trusted origins (the website) to every route, so
 * authed routes work from the browser.
 *
 * The public API reflects any origin without credentials (see `cors()`), so credentials are
 * deliberately not enabled for other origins: that would let any site read a signed-in user's session.
 * Must be registered before `cors()` so preflight responses carry the header too.
 */
export const authCors = new Elysia({ name: "auth-cors" }).onRequest(({ request, set }) => {
  const origin = request.headers.get("origin");
  if (origin && AUTH_TRUSTED_ORIGINS.includes(origin)) {
    set.headers["access-control-allow-credentials"] = "true";
  }
});
