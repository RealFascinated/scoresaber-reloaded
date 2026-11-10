import { env } from "@ssr/common/env";
import type { AuthMeResponse } from "@ssr/common/schemas/response/auth/me";
import type { PlayerIdListResponse } from "@ssr/common/schemas/response/user/following";
import { DEFAULT_USER_PREFERENCES, type UserPreferences } from "@ssr/common/schemas/user/preferences";
import { assertUserPreferences } from "../preferences/preferences-api";

const SESSION_REQUEST_TIMEOUT_MS = 3000;

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
 *
 * @param cookie the raw `cookie` header of the incoming request
 * @param withUserData whether to also fetch the user's preferences and who they follow
 */
export async function getServerSession(cookie: string, withUserData: boolean): Promise<ServerSession> {
  if (!cookie) {
    return { status: "anonymous" };
  }

  try {
    const [meResponse, preferencesResponse, followingResponse] = await Promise.all([
      backendGet("/me", cookie),
      withUserData ? backendGet("/user/preferences", cookie) : Promise.resolve(undefined),
      withUserData ? backendGet("/user/following", cookie) : Promise.resolve(undefined),
    ]);
    if (meResponse.status === 401) {
      return { status: "anonymous" };
    }
    if (
      !meResponse.ok ||
      (preferencesResponse && !preferencesResponse.ok) ||
      (followingResponse && !followingResponse.ok)
    ) {
      return { status: "unavailable" };
    }

    const me = (await meResponse.json()) as AuthMeResponse;
    const preferences = preferencesResponse
      ? assertUserPreferences((await preferencesResponse.json()) as UserPreferences)
      : DEFAULT_USER_PREFERENCES;
    const following = followingResponse
      ? ((await followingResponse.json()) as PlayerIdListResponse).playerIds
      : [];
    return { status: "signed-in", me, preferences, following };
  } catch {
    return { status: "unavailable" };
  }
}
