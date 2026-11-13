import { DEFAULT_USER_PREFERENCES } from "@ssr/common/schemas/user/default-preferences";
import { afterEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../../src/db";
import { authUsersTable, userPreferencesTable } from "../../src/db/schema";
import { UserPreferencesRepository } from "../../src/repositories/user-preferences.repository";
import { expectStatus, expectValidationError } from "../helpers/assertions";
import {
  WEBSITE_ORIGIN,
  mockSteamVerification,
  originalFetch,
  signInWithSteam,
  toCookieHeader,
} from "../helpers/auth";
import { createTestApp } from "../helpers/create-test-app";
import { request } from "../helpers/request";

describe("user preferences", () => {
  const app = createTestApp();

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  async function signIn(steamId: string): Promise<string> {
    mockSteamVerification(true);
    return toCookieHeader(await signInWithSteam(app, steamId));
  }

  function get(cookie?: string) {
    return request(app, "/user/preferences", { headers: cookie ? { cookie } : {} });
  }

  function patch(cookie: string | undefined, body: unknown) {
    return request(app, "/user/preferences", {
      method: "PATCH",
      headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
      body: JSON.stringify(body),
    });
  }

  test("rejects anonymous requests", async () => {
    expectStatus(await get(), 401);
    expectStatus(await patch(undefined, { showKitty: true }), 401);
  });

  test("returns the defaults for a new user, never cached", async () => {
    const cookie = await signIn("76561198000000001");

    const response = await get(cookie);
    expectStatus(response, 200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual(DEFAULT_USER_PREFERENCES);
  });

  test("a patch replaces only the given keys and returns everything", async () => {
    const cookie = await signIn("76561198000000001");

    const first = await patch(cookie, { showKitty: true });
    expectStatus(first, 200);
    expect(await first.json()).toEqual({ ...DEFAULT_USER_PREFERENCES, showKitty: true });

    const second = await patch(cookie, { snowParticles: true, whatIfRange: [80, 99] });
    expectStatus(second, 200);
    const expected = {
      ...DEFAULT_USER_PREFERENCES,
      showKitty: true,
      snowParticles: true,
      whatIfRange: [80, 99],
    };
    expect(await second.json()).toEqual(expected);
    expect(await (await get(cookie)).json()).toEqual(expected);
  });

  test("replaces nested values as a whole and clears nullable keys", async () => {
    const cookie = await signIn("76561198000000001");
    await patch(cookie, {
      chartLegends: { a: { x: true }, b: { y: false } },
      defaultLeaderboardCountry: "GB",
    });

    const response = await patch(cookie, {
      chartLegends: { a: { z: true } },
      defaultLeaderboardCountry: null,
    });
    expect(await response.json()).toMatchObject({
      chartLegends: { a: { z: true } },
      defaultLeaderboardCountry: null,
    });
  });

  test.each([
    ["a wrong type", { showKitty: "yes" }],
    ["an out of range number", { backgroundCoverBlur: 500 }],
    ["an invalid enum value", { historyMode: "wild" }],
    ["an unknown replay viewer", { replayViewer: "other" }],
    ["a malformed whatIfRange", { whatIfRange: [90] }],
    ["a background with quotes", { customBackground: 'https://a.b/x.png"); color: red' }],
    ["a bad background cover id", { backgroundCover: "../etc" }],
  ])("rejects %s", async (_name, body) => {
    const cookie = await signIn("76561198000000001");
    await expectValidationError(await patch(cookie, body));
    expect(await (await get(cookie)).json()).toEqual(DEFAULT_USER_PREFERENCES);
  });

  test("ignores unknown keys without storing them", async () => {
    const cookie = await signIn("76561198000000001");

    const response = await patch(cookie, { nope: true, showKitty: true });
    expectStatus(response, 200);
    expect(await response.json()).toEqual({ ...DEFAULT_USER_PREFERENCES, showKitty: true });

    const [row] = await db.select().from(userPreferencesTable);
    expect(row.preferences).toEqual({ showKitty: true });
  });

  test("users never see each other's preferences", async () => {
    const first = await signIn("76561198000000001");
    const second = await signIn("76561198000000002");

    await patch(first, { showKitty: true });

    expect(await (await get(second)).json()).toEqual(DEFAULT_USER_PREFERENCES);
    expect(await (await get(first)).json()).toMatchObject({ showKitty: true });
  });

  test("concurrent patches of different keys are all kept", async () => {
    const cookie = await signIn("76561198000000001");

    await Promise.all([
      patch(cookie, { showKitty: true }),
      patch(cookie, { snowParticles: true }),
      patch(cookie, { plusPpDefaultAccuracy: 90 }),
    ]);

    expect(await (await get(cookie)).json()).toMatchObject({
      showKitty: true,
      snowParticles: true,
      plusPpDefaultAccuracy: 90,
    });
  });

  test("corrupt or removed stored values fall back to the defaults", async () => {
    const cookie = await signIn("76561198000000001");
    const [user] = await db.select().from(authUsersTable);
    await db.insert(userPreferencesTable).values({
      userId: user.id,
      preferences: JSON.parse('{"historyMode":"gone","showKitty":true,"legacyKey":1}'),
    });

    expect(await (await get(cookie)).json()).toEqual({ ...DEFAULT_USER_PREFERENCES, showKitty: true });
  });

  test("deleting the user deletes their preferences", async () => {
    const cookie = await signIn("76561198000000001");
    await patch(cookie, { showKitty: true });

    const [user] = await db.select().from(authUsersTable);
    await db.delete(authUsersTable).where(eq(authUsersTable.id, user.id));

    expect(await db.select().from(userPreferencesTable)).toHaveLength(0);
  });

  test("allows credentialed PATCH preflights from the website only", async () => {
    const preflight = (origin: string) =>
      request(app, "/user/preferences", {
        method: "OPTIONS",
        headers: { origin, "access-control-request-method": "PATCH" },
      });

    const allowed = await preflight(WEBSITE_ORIGIN);
    expect(allowed.headers.get("access-control-allow-credentials")).toBe("true");
    expect(allowed.headers.get("access-control-allow-methods")).toContain("PATCH");
    expect(
      (await preflight("https://evil.example")).headers.get("access-control-allow-credentials")
    ).toBeNull();
  });

  test("resolve applies defaults to missing preferences", () => {
    expect(UserPreferencesRepository.resolve(undefined)).toEqual(DEFAULT_USER_PREFERENCES);
  });
});
