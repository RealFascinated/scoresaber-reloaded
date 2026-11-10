import { AUTH_ROUTE } from "@ssr/common/api-routes";
import { env } from "@ssr/common/env";
import type { AuthMeResponse } from "@ssr/common/schemas/response/auth/me";

/**
 * Calls the backend auth routes. The session lives in a cookie set by the backend, so every
 * request has to include credentials.
 */
function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, { ...init, credentials: "include" });
}

/**
 * Fetches the signed-in user.
 *
 * @returns the signed-in user, or null when nobody is signed in
 * @throws when the backend could not be reached or answered with an error
 */
export async function fetchMe(): Promise<AuthMeResponse | null> {
  const response = await authFetch("/me");
  if (response.status === 401) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch the signed-in user (${response.status})`);
  }
  return (await response.json()) as AuthMeResponse;
}

/**
 * The page that lists the sign-in providers, and where failed sign-ins return to.
 */
export const LOGIN_PATH = "/login";

/**
 * Only allows redirecting to a path on this site, so a login link can't send users elsewhere.
 *
 * @returns the redirect path, or "/" when it is missing or not a local path
 */
export function getSafeRedirectPath(redirect: string | null | undefined): string {
  if (!redirect || !redirect.startsWith("/") || redirect.startsWith("//") || redirect.startsWith("/\\")) {
    return "/";
  }
  return redirect;
}

/**
 * Starts the Steam sign-in by sending the browser to Steam. Steam returns to the backend,
 * which then redirects to the given path (or back to the login page with an `error` on failure).
 */
export async function signInWithSteam(redirectPath: string = "/"): Promise<void> {
  const response = await authFetch(`${AUTH_ROUTE}/sign-in/social`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      provider: "steam",
      callbackURL: `${window.location.origin}${getSafeRedirectPath(redirectPath)}`,
      errorCallbackURL: `${window.location.origin}${LOGIN_PATH}`,
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to start the Steam sign-in (${response.status})`);
  }

  const { url } = (await response.json()) as { url: string };
  window.location.assign(url);
}

export async function signOut(): Promise<void> {
  const response = await authFetch(`${AUTH_ROUTE}/sign-out`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  if (!response.ok) {
    throw new Error(`Failed to sign out (${response.status})`);
  }
}
