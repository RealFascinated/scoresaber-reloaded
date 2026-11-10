import { afterEach, describe, expect, test } from "bun:test";
import { db } from "../../src/db";
import { authConnectionsTable, authUsersTable, scoreSaberAccountsTable } from "../../src/db/schema";
import { AuthConnectionsRepository } from "../../src/repositories/auth-connections.repository";
import { expectStatus } from "../helpers/assertions";
import {
  API_ORIGIN,
  STEAM_ID,
  STEAM_OPENID_ENDPOINT,
  WEBSITE_ORIGIN,
  mockSteamVerification,
  originalFetch,
  signInWithSteam,
  toCookieHeader,
} from "../helpers/auth";
import { TEST_AVATAR } from "../helpers/constants";
import { createTestApp } from "../helpers/create-test-app";
import { request } from "../helpers/request";

describe("auth", () => {
  const app = createTestApp();

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("GET /me", () => {
    test("rejects anonymous requests", async () => {
      expectStatus(await request(app, "/me"), 401);
    });

    test("rejects an invalid session cookie", async () => {
      const response = await request(app, "/me", { headers: { cookie: "ssr.session_token=not-a-session" } });
      expectStatus(response, 401);
    });
  });

  describe("Steam sign-in", () => {
    test("starts at Steam's OpenID endpoint and returns to the backend callback", async () => {
      const response = await request(app, "/auth/sign-in/social", {
        method: "POST",
        headers: { "content-type": "application/json", origin: WEBSITE_ORIGIN },
        body: JSON.stringify({ provider: "steam", callbackURL: `${WEBSITE_ORIGIN}/` }),
      });
      expectStatus(response, 200);

      const { url } = (await response.json()) as { url: string };
      const steamUrl = new URL(url);
      expect(`${steamUrl.origin}${steamUrl.pathname}`).toBe(STEAM_OPENID_ENDPOINT);
      expect(steamUrl.searchParams.get("openid.return_to")).toStartWith(`${API_ORIGIN}/auth/callback/steam?`);
    });

    test("creates a session for the verified Steam player that unlocks protected routes", async () => {
      mockSteamVerification(true);

      const callback = await signInWithSteam(app, STEAM_ID);
      expectStatus(callback, 302);
      expect(callback.headers.get("location")).toBe(`${WEBSITE_ORIGIN}/`);

      const me = await request(app, "/me", { headers: { cookie: toCookieHeader(callback) } });
      expectStatus(me, 200);
      expect(await me.json()).toEqual({
        id: expect.any(String),
        name: STEAM_ID,
        image: null,
        playerId: STEAM_ID,
        connections: [{ provider: "STEAM", id: STEAM_ID, isPrimary: true }],
      });
    });

    test("uses the tracked ScoreSaber player's name and avatar", async () => {
      mockSteamVerification(true);
      await db.insert(scoreSaberAccountsTable).values({
        id: STEAM_ID,
        name: "TrackedSteamPlayer",
        avatar: TEST_AVATAR,
        seededScores: true,
        seededBeatLeaderScores: true,
        trackReplays: false,
        inactive: false,
        banned: false,
        trackedSince: new Date(),
        joinedDate: new Date(),
      });

      const callback = await signInWithSteam(app, STEAM_ID);
      expectStatus(callback, 302);

      const me = await request(app, "/me", { headers: { cookie: toCookieHeader(callback) } });
      expect(await me.json()).toMatchObject({
        name: "TrackedSteamPlayer",
        image: TEST_AVATAR,
        playerId: STEAM_ID,
      });
    });

    test("signing in twice reuses the same user", async () => {
      mockSteamVerification(true);

      await signInWithSteam(app, STEAM_ID);
      await signInWithSteam(app, STEAM_ID);

      expect(await db.select().from(authUsersTable)).toHaveLength(1);
      expect(await db.select().from(authConnectionsTable)).toHaveLength(1);
    });

    test("signing out ends the session", async () => {
      mockSteamVerification(true);
      const callback = await signInWithSteam(app, STEAM_ID);
      const cookie = toCookieHeader(callback);

      const signOut = await request(app, "/auth/sign-out", {
        method: "POST",
        headers: { "content-type": "application/json", origin: WEBSITE_ORIGIN, cookie },
        body: "{}",
      });
      expectStatus(signOut, 200);
      expect(signOut.headers.get("access-control-allow-credentials")).toBe("true");

      expectStatus(await request(app, "/me", { headers: { cookie } }), 401);
    });

    test("does not sign in when Steam rejects the assertion", async () => {
      mockSteamVerification(false);

      const callback = await signInWithSteam(app, STEAM_ID);
      expectStatus(callback, 302);
      expect(callback.headers.get("location")).toContain("error=");
      expect(callback.headers.getSetCookie().some(cookie => cookie.startsWith("ssr.session_token="))).toBe(
        false
      );
      expect(await db.select().from(authUsersTable)).toHaveLength(0);
    });
  });

  describe("CORS", () => {
    async function preflight(origin: string) {
      return request(app, "/auth/get-session", {
        method: "OPTIONS",
        headers: { origin, "access-control-request-method": "GET" },
      });
    }

    test("allows credentials for the website origin on auth routes", async () => {
      const response = await preflight(WEBSITE_ORIGIN);
      expect(response.headers.get("access-control-allow-origin")).toBe(WEBSITE_ORIGIN);
      expect(response.headers.get("access-control-allow-credentials")).toBe("true");
    });

    test("never allows credentials for other origins", async () => {
      const response = await preflight("https://evil.example");
      expect(response.headers.get("access-control-allow-credentials")).toBeNull();
    });

    test("allows credentials for the website origin on authed routes", async () => {
      const response = await request(app, "/me", { headers: { origin: WEBSITE_ORIGIN } });
      expect(response.headers.get("access-control-allow-credentials")).toBe("true");
    });

    test("never allows credentials for other origins on authed routes", async () => {
      const response = await request(app, "/me", { headers: { origin: "https://evil.example" } });
      expect(response.headers.get("access-control-allow-credentials")).toBeNull();
    });
  });

  describe("connections", () => {
    const OCULUS_ID = "2538637699496776";

    async function createUser(id: string): Promise<string> {
      await db.insert(authUsersTable).values({ id, name: id, email: `${id}@test.invalid` });
      return id;
    }

    test("the first connection becomes the primary one and sets the public player id", async () => {
      const userId = await createUser("user-1");

      expect(await AuthConnectionsRepository.link(userId, "OCULUS", OCULUS_ID)).toBe("linked");

      const [user] = await db.select().from(authUsersTable);
      expect(user.playerId).toBe(OCULUS_ID);
      expect(await AuthConnectionsRepository.getByUserId(userId)).toEqual([
        { provider: "OCULUS", id: OCULUS_ID, isPrimary: true },
      ]);
    });

    test("later connections are not primary and keep the player id", async () => {
      const userId = await createUser("user-1");
      await AuthConnectionsRepository.link(userId, "OCULUS", OCULUS_ID);

      expect(await AuthConnectionsRepository.link(userId, "STEAM", STEAM_ID)).toBe("linked");

      const [user] = await db.select().from(authUsersTable);
      expect(user.playerId).toBe(OCULUS_ID);
      expect(await AuthConnectionsRepository.getByUserId(userId)).toEqual([
        { provider: "OCULUS", id: OCULUS_ID, isPrimary: true },
        { provider: "STEAM", id: STEAM_ID, isPrimary: false },
      ]);
    });

    test("linking the same account again changes nothing", async () => {
      const userId = await createUser("user-1");
      await AuthConnectionsRepository.link(userId, "STEAM", STEAM_ID);

      expect(await AuthConnectionsRepository.link(userId, "STEAM", STEAM_ID)).toBe("already-linked");
      expect(await db.select().from(authConnectionsTable)).toHaveLength(1);
    });

    test("an account that belongs to another user is never moved", async () => {
      const owner = await createUser("user-1");
      const other = await createUser("user-2");
      await AuthConnectionsRepository.link(owner, "STEAM", STEAM_ID);

      expect(await AuthConnectionsRepository.link(other, "STEAM", STEAM_ID)).toBe("taken");
      expect(await AuthConnectionsRepository.getByUserId(other)).toEqual([]);
      expect(await AuthConnectionsRepository.getByUserId(owner)).toHaveLength(1);
    });
  });
});
