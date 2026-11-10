import { SHARED_CONSTS } from "@ssr/common/shared-consts";
import { afterEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../../src/db";
import { authUsersTable, userFollowsTable } from "../../src/db/schema";
import { expectStatus } from "../helpers/assertions";
import { mockSteamVerification, originalFetch, signInWithSteam, toCookieHeader } from "../helpers/auth";
import { createTestApp } from "../helpers/create-test-app";
import { request } from "../helpers/request";

const ALICE = "76561198000000001";
const BOB = "76561198000000002";
const CAROL = "76561198000000003";

describe("following", () => {
  const app = createTestApp();

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  async function signIn(steamId: string): Promise<string> {
    mockSteamVerification(true);
    return toCookieHeader(await signInWithSteam(app, steamId));
  }

  const send = (method: string, path: string, cookie?: string) =>
    request(app, path, { method, headers: cookie ? { cookie } : {} });

  const follow = (cookie: string | undefined, playerId: string) =>
    send("PUT", `/user/following/${playerId}`, cookie);
  const unfollow = (cookie: string | undefined, playerId: string) =>
    send("DELETE", `/user/following/${playerId}`, cookie);

  test("requires a signed-in user", async () => {
    expectStatus(await send("GET", "/user/following"), 401);
    expectStatus(await follow(undefined, BOB), 401);
    expectStatus(await unfollow(undefined, BOB), 401);
  });

  test("starts empty and never caches", async () => {
    const cookie = await signIn(ALICE);
    const response = await send("GET", "/user/following", cookie);
    expectStatus(response, 200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ playerIds: [] });
  });

  test("follows and unfollows players, returning the full list", async () => {
    const cookie = await signIn(ALICE);

    expect(await (await follow(cookie, BOB)).json()).toEqual({ playerIds: [BOB] });
    expect(await (await follow(cookie, CAROL)).json()).toEqual({ playerIds: [BOB, CAROL] });
    expect(await (await unfollow(cookie, BOB)).json()).toEqual({ playerIds: [CAROL] });
    expect(await (await send("GET", "/user/following", cookie)).json()).toEqual({ playerIds: [CAROL] });
  });

  test("following twice and unfollowing a stranger change nothing", async () => {
    const cookie = await signIn(ALICE);
    await follow(cookie, BOB);

    expect(await (await follow(cookie, BOB)).json()).toEqual({ playerIds: [BOB] });
    expect(await (await unfollow(cookie, CAROL)).json()).toEqual({ playerIds: [BOB] });
    expect(await db.select().from(userFollowsTable)).toHaveLength(1);
  });

  test("a user can't follow themselves", async () => {
    const cookie = await signIn(ALICE);
    expectStatus(await follow(cookie, ALICE), 400);
    expect(await db.select().from(userFollowsTable)).toHaveLength(0);
  });

  test("a user can't follow more than the maximum", async () => {
    const cookie = await signIn(ALICE);
    for (let i = 0; i < SHARED_CONSTS.maxFollowing; i++) {
      expectStatus(await follow(cookie, `1000${i}`), 200);
    }

    expectStatus(await follow(cookie, "99999"), 400);
    // Following someone already followed is still fine at the limit
    expectStatus(await follow(cookie, "10000"), 200);
    expect(await db.select().from(userFollowsTable)).toHaveLength(SHARED_CONSTS.maxFollowing);
  });

  test("rejects malformed player ids", async () => {
    const cookie = await signIn(ALICE);
    expectStatus(await follow(cookie, "not%20valid"), 422);
  });

  test("users have separate lists", async () => {
    const alice = await signIn(ALICE);
    const bob = await signIn(BOB);

    await follow(alice, CAROL);

    expect(await (await send("GET", "/user/following", bob)).json()).toEqual({ playerIds: [] });
  });

  describe("public lists", () => {
    test("reports followers and following of a player", async () => {
      const alice = await signIn(ALICE);
      const bob = await signIn(BOB);
      await follow(alice, BOB);
      await follow(alice, CAROL);
      await follow(bob, CAROL);

      const counts = (playerId: string) => send("GET", `/player/${playerId}/follows`);
      expect(await (await counts(ALICE)).json()).toEqual({ followers: 0, following: 2 });
      expect(await (await counts(BOB)).json()).toEqual({ followers: 1, following: 1 });
      expect(await (await counts(CAROL)).json()).toEqual({ followers: 2, following: 0 });
      expect(await (await counts("1")).json()).toEqual({ followers: 0, following: 0 });
    });

    test("lists followers newest first and following oldest first, without signing in", async () => {
      const alice = await signIn(ALICE);
      const bob = await signIn(BOB);
      await follow(alice, CAROL);
      await follow(bob, CAROL);
      await follow(alice, BOB);

      expect(await (await send("GET", `/player/${CAROL}/followers`)).json()).toEqual({
        playerIds: [BOB, ALICE],
      });
      expect(await (await send("GET", `/player/${ALICE}/following`)).json()).toEqual({
        playerIds: [CAROL, BOB],
      });
    });

    test("deleting a user removes their follows from the counts", async () => {
      const alice = await signIn(ALICE);
      await follow(alice, BOB);

      const [user] = await db.select().from(authUsersTable);
      await db.delete(authUsersTable).where(eqUser(user.id));

      expect(await (await send("GET", `/player/${BOB}/follows`)).json()).toEqual({
        followers: 0,
        following: 0,
      });
    });
  });
});

function eqUser(id: string) {
  return eq(authUsersTable.id, id);
}
