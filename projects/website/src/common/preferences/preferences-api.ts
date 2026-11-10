import { USER_PREFERENCES_ROUTE } from "@ssr/common/api-routes";
import { env } from "@ssr/common/env";
import {
  DEFAULT_USER_PREFERENCES,
  UserPreferencesSchema,
  type UserPreferences,
  type UserPreferencesPatch,
} from "@ssr/common/schemas/user/preferences";
import { Value } from "typebox/value";

/**
 * Validates a response of the preferences routes.
 *
 * @throws when the response does not match the preferences schema
 */
export function assertUserPreferences(value: UserPreferences): UserPreferences {
  if (!Value.Check(UserPreferencesSchema, value)) {
    throw new Error("The backend returned invalid preferences");
  }
  return value;
}

/**
 * Fetches the preferences of the signed-in user.
 *
 * @returns the preferences, the defaults when nobody is signed in
 * @throws when the backend could not be reached or answered with an error
 */
export async function fetchUserPreferences(): Promise<UserPreferences> {
  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}${USER_PREFERENCES_ROUTE}`, {
    credentials: "include",
  });
  if (response.status === 401) {
    return DEFAULT_USER_PREFERENCES;
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch preferences (${response.status})`);
  }
  return assertUserPreferences((await response.json()) as UserPreferences);
}

/**
 * Replaces one or more preferences of the signed-in user.
 *
 * @returns all the preferences after the update
 * @throws when the update was rejected or the backend could not be reached
 */
export async function patchUserPreferences(patch: UserPreferencesPatch): Promise<UserPreferences> {
  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}${USER_PREFERENCES_ROUTE}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) {
    throw new Error(`Failed to save preferences (${response.status})`);
  }
  return assertUserPreferences((await response.json()) as UserPreferences);
}
