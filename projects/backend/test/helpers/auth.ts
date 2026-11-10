import { expect } from "bun:test";
import { expectStatus } from "./assertions";
import type { createTestApp } from "./create-test-app";
import { request, type TestResponse } from "./request";

export const STEAM_ID = "76561198000000001";
export const STEAM_OPENID_ENDPOINT = "https://steamcommunity.com/openid/login";
export const WEBSITE_ORIGIN = "http://localhost:3000";
export const API_ORIGIN = "http://localhost:8080";

export const originalFetch = globalThis.fetch;

/**
 * Fakes Steam's `check_authentication` endpoint, the only network call of the Steam sign-in
 * when no Web API key is configured.
 */
export function mockSteamVerification(isValid: boolean): void {
  globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith(STEAM_OPENID_ENDPOINT)) {
      return new Response(`ns:http://specs.openid.net/auth/2.0\nis_valid:${isValid}\n`);
    }
    return originalFetch(input, init);
  }) as typeof fetch;
}

export function toCookieHeader(response: TestResponse): string {
  return response.headers
    .getSetCookie()
    .map(cookie => cookie.split(";")[0])
    .join("; ");
}

/**
 * Runs the whole Steam sign-in against the app: starts the flow, then answers with the
 * assertion Steam would send back to the callback.
 */
export async function signInWithSteam(app: ReturnType<typeof createTestApp>, steamId: string) {
  const start = await request(app, "/auth/sign-in/social", {
    method: "POST",
    headers: { "content-type": "application/json", origin: WEBSITE_ORIGIN },
    body: JSON.stringify({ provider: "steam", callbackURL: `${WEBSITE_ORIGIN}/` }),
  });
  expectStatus(start, 200);

  const { url } = (await start.json()) as { url: string };
  const returnTo = new URL(url).searchParams.get("openid.return_to");
  expect(returnTo).toBeTruthy();

  const identity = `https://steamcommunity.com/openid/id/${steamId}`;
  const callback = new URL(returnTo!);
  for (const [key, value] of Object.entries({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "id_res",
    "openid.op_endpoint": STEAM_OPENID_ENDPOINT,
    "openid.claimed_id": identity,
    "openid.identity": identity,
    "openid.return_to": returnTo!,
    "openid.response_nonce": "2026-11-10T00:00:00Zabc",
    "openid.assoc_handle": "1234567890",
    "openid.signed": "signed,op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle",
    "openid.sig": "c2lnbmF0dXJl",
  })) {
    callback.searchParams.set(key, value);
  }

  return request(app, callback.toString(), { headers: { cookie: toCookieHeader(start) } });
}
