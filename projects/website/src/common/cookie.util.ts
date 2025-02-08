import { isServer } from "@ssr/common/utils/utils";

export type CookieName = "playerId" | "lastScoreSort";

/**
 * Gets the value of a cookie
 *
 * @param name the name of the cookie
 * @param defaultValue the fallback value
 * @returns the value of the cookie, or the fallback value (undefined if no fallback value is provided)
 */
export async function getCookieValue(
  name: CookieName,
  defaultValue?: string
): Promise<string | undefined> {
  let value: string | undefined;
  if (isServer()) {
    const { cookies } = await import("next/headers");

    const cookieStore = await cookies();
    const cookieValue = cookieStore.get(name)?.value;
    value = cookieValue ? cookieValue : defaultValue ? defaultValue : undefined;
  } else {
    const { get } = (await import("js-cookie")).default;
    value = get(name) || defaultValue ? defaultValue : undefined;
  }

  return value;
}

/**
 * Sets the value of a cookie
 *
 * @param name the name of the cookie
 * @param value the value of the cookie
 */
export async function setCookieValue(name: CookieName, value: string) {
  if (isServer()) {
    const { cookies } = await import("next/headers");

    const cookieStore = await cookies();
    cookieStore.set(name, value, {
      path: "/",
    });
  }
  const { set } = (await import("js-cookie")).default;
  set(name, value, {
    path: "/",
  });
}
