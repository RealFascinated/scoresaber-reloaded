import Cookies from "js-cookie";

export type CookieName =
  | "playerId"
  | "websiteLanding"

  // ScoreSaber
  | "scoreaber-scoreSort"

  // AccSaber
  | "accsaber-scoreSort"
  | "accsaber-scoreType"
  | "accsaber-scoreOrder";

/**
 * Gets the value of a cookie
 *
 * @param name the name of the cookie
 * @param defaultValue the fallback value
 * @returns the value of the cookie, or the fallback value (undefined if no fallback value is provided)
 */
export function getCookieValue(name: CookieName, defaultValue?: string): string | undefined {
  return Cookies.get(name) || defaultValue ? defaultValue : undefined;
}

/**
 * Sets the value of a cookie
 *
 * @param name the name of the cookie
 * @param value the value of the cookie
 */
export function setCookieValue(name: CookieName, value: string) {
  Cookies.set(name, value, {
    path: "/",
  });
}

/**
 * Deletes a cookie
 *
 * @param name the name of the cookie
 */
export function deleteCookieValue(name: CookieName) {
  Cookies.remove(name);
}
