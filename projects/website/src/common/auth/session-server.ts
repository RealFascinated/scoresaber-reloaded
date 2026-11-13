import { USER_FOLLOWING_ROUTE, USER_PREFERENCES_ROUTE } from "@ssr/common/api-routes";
import { env } from "@ssr/common/env";
import { parseSchema } from "@ssr/common/schemas/parse";
import { AuthMeResponseSchema, type AuthMeResponse } from "@ssr/common/schemas/response/auth/me";
import { PlayerIdListResponseSchema } from "@ssr/common/schemas/response/user/following";
import { UserPreferencesSchema, type UserPreferences } from "@ssr/common/schemas/user/preferences";
import { cache } from "react";
import { Value } from "typebox/value";

const SESSION_REQUEST_TIMEOUT_MS = 3000;

/**
 * Validates the preferences response. Only done on the server, so TypeBox stays out of the browser.
 *
 * @throws when the response does not match the preferences schema
 */
function assertUserPreferences(value: UserPreferences): UserPreferences {
  if (!Value.Check(UserPreferencesSchema, value)) {
    throw new Error("The backend returned invalid preferences");
  }
  return value;
}

export type ServerSession =
  | { status: "signed-in"; me: AuthMeResponse; preferences: UserPreferences; following: string[] }
  | { status: "anonymous" }
  /** The backend could not answer, callers must not treat this as signed out. */
  | { status: "unavailable" };

async function backendGet(path: string, cookie: string): Promise<Response> {
  return fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, {
    headers: { cookie },
    cache: "no-store",
    signal: AbortSignal.timeout(SESSION_REQUEST_TIMEOUT_MS),
  });
}

/**
 * Resolves the session of a request on the server by forwarding its cookies to the backend.
 * A body that does not match its schema counts as the backend being unavailable.
 * The result is shared by everything rendered in the same request, so the layout and a page can both ask for it.
 */
export const getServerSession = cache(async (cookie: string): Promise<ServerSession> => {
  if (!cookie) {
    return { status: "anonymous" };
  }

  try {
    const [meResponse, preferencesResponse, followingResponse] = await Promise.all([
      backendGet("/me", cookie),
      backendGet(USER_PREFERENCES_ROUTE, cookie),
      backendGet(USER_FOLLOWING_ROUTE, cookie),
    ]);
    if (meResponse.status === 401) {
      return { status: "anonymous" };
    }
    if (!meResponse.ok || !preferencesResponse.ok || !followingResponse.ok) {
      return { status: "unavailable" };
    }

    const me = parseSchema(AuthMeResponseSchema, await meResponse.json());
    const preferences = assertUserPreferences(await preferencesResponse.json());
    const following = parseSchema(PlayerIdListResponseSchema, await followingResponse.json());
    return { status: "signed-in", me, preferences, following: following.playerIds };
  } catch {
    return { status: "unavailable" };
  }
});
