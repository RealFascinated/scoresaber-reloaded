import { headers } from "next/headers";

/**
 * Whether the current request came from a phone. Uses the Sec-CH-UA-Mobile client hint when the browser sends it,
 * and otherwise the "Mobi" token that phone browsers put in the User-Agent (tablets don't, and are wider than
 * the phone breakpoint anyway). It is only a hint for what to render first: the client still measures the
 * real viewport and corrects it.
 */
export async function isPhoneRequest(): Promise<boolean> {
  const requestHeaders = await headers();

  const mobileHint = requestHeaders.get("sec-ch-ua-mobile");
  if (mobileHint) {
    return mobileHint === "?1";
  }
  return /Mobi/i.test(requestHeaders.get("user-agent") ?? "");
}
