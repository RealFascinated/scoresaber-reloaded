import { SHARED_CONSTS } from "@ssr/common/shared-consts";
import { afterEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../../src/db";
import {
  scoreSaberScoreHistoryTable,
  scoreSaberScoresTable,
  userPinnedScoresTable,
} from "../../src/db/schema";
import { expectStatus } from "../helpers/assertions";
import { mockSteamVerification, originalFetch, signInWithSteam, toCookieHeader } from "../helpers/auth";
import { TEST_LEADERBOARD_ID, TEST_PLAYER_ID } from "../helpers/constants";
import { createTestApp } from "../helpers/create-test-app";
import { request } from "../helpers/request";

const ALICE = "76561198000000001";
const BOB = "76561198000000002";
const EXTRA_LEADERBOARD_BASE = 800_000;

async function insertScore(playerId: string, leaderboardId: number, scoreId: number): Promise<void> {
  await db.insert(scoreSaberScoresTable).values({
    scoreId,
    playerId,
    leaderboardId,
    difficulty: "ExpertPlus",
    characteristic: "Standard",
    score: 900,
    accuracy: 0.9,
    medals: 0,
    missedNotes: 0,
    badCuts: 0,
    maxCombo: 400,
    fullCombo: true,
    modifiers: [],
    timestamp: new Date(),
  });
}

/** Moves a current score into the score history, like when the player improves it. */
async function archiveScore(scoreId: number): Promise<void> {
  const [row] = await db
    .select()
    .from(scoreSaberScoresTable)
    .where(eq(scoreSaberScoresTable.scoreId, scoreId));
  await db.delete(scoreSaberScoresTable).where(eq(scoreSaberScoresTable.scoreId, scoreId));
  await db.insert(scoreSaberScoreHistoryTable).values({
    playerId: row.playerId,
    leaderboardId: row.leaderboardId,
    scoreId: row.scoreId,
    difficulty: row.difficulty,
    characteristic: row.characteristic,
    score: row.score,
    accuracy: row.accuracy,
    missedNotes: row.missedNotes,
    badCuts: row.badCuts,
    maxCombo: row.maxCombo,
    fullCombo: row.fullCombo,
    timestamp: row.timestamp,
  });
}

describe("pinned scores", () => {
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
  const pin = (cookie: string | undefined, scoreId: number) =>
    send("PUT", `/user/pinned-scores/${scoreId}`, cookie);
  const unpin = (cookie: string | undefined, scoreId: number) =>
    send("DELETE", `/user/pinned-scores/${scoreId}`, cookie);

  test("requires a signed-in user", async () => {
    expectStatus(await send("GET", "/user/pinned-scores"), 401);
    expectStatus(await pin(undefined, 810_001), 401);
    expectStatus(await unpin(undefined, 810_001), 401);
  });

  test("pins and unpins the user's own scores", async () => {
    const cookie = await signIn(ALICE);
    await insertScore(ALICE, TEST_LEADERBOARD_ID, 810_001);

    const pinned = await pin(cookie, 810_001);
    expectStatus(pinned, 200);
    expect(await pinned.json()).toEqual({ scoreIds: [810_001] });
    expect(await (await send("GET", "/user/pinned-scores", cookie)).json()).toEqual({ scoreIds: [810_001] });

    expect(await (await unpin(cookie, 810_001)).json()).toEqual({ scoreIds: [] });
  });

  test("pinning twice and unpinning something unpinned change nothing", async () => {
    const cookie = await signIn(ALICE);
    await insertScore(ALICE, TEST_LEADERBOARD_ID, 810_001);

    await pin(cookie, 810_001);
    expect(await (await pin(cookie, 810_001)).json()).toEqual({ scoreIds: [810_001] });
    expect(await (await unpin(cookie, 123)).json()).toEqual({ scoreIds: [810_001] });
    expect(await db.select().from(userPinnedScoresTable)).toHaveLength(1);
  });

  test("can't pin a score that doesn't exist, or someone else's", async () => {
    const cookie = await signIn(ALICE);
    expectStatus(await pin(cookie, 999_999), 400);

    await insertScore(TEST_PLAYER_ID, EXTRA_LEADERBOARD_BASE, 810_100);
    expectStatus(await pin(cookie, 810_100), 400);
    expect(await db.select().from(userPinnedScoresTable)).toHaveLength(0);
  });

  test("can pin an older score from the score history", async () => {
    const cookie = await signIn(ALICE);
    await insertScore(ALICE, TEST_LEADERBOARD_ID, 810_001);
    await archiveScore(810_001);
    await insertScore(ALICE, TEST_LEADERBOARD_ID, 810_002);

    expectStatus(await pin(cookie, 810_001), 200);
  });

  test("can't pin more than the maximum", async () => {
    const cookie = await signIn(ALICE);
    for (let i = 0; i <= SHARED_CONSTS.maxPinnedScores; i++) {
      await insertScore(ALICE, EXTRA_LEADERBOARD_BASE + i, 820_000 + i);
    }

    for (let i = 0; i < SHARED_CONSTS.maxPinnedScores; i++) {
      expectStatus(await pin(cookie, 820_000 + i), 200);
    }
    expectStatus(await pin(cookie, 820_000 + SHARED_CONSTS.maxPinnedScores), 400);
    // Already pinned scores are still fine at the limit
    expectStatus(await pin(cookie, 820_000), 200);
    expect(await db.select().from(userPinnedScoresTable)).toHaveLength(SHARED_CONSTS.maxPinnedScores);
  });

  test("users have separate pins", async () => {
    const alice = await signIn(ALICE);
    const bob = await signIn(BOB);
    await insertScore(ALICE, TEST_LEADERBOARD_ID, 810_001);
    await pin(alice, 810_001);

    expect(await (await send("GET", "/user/pinned-scores", bob)).json()).toEqual({ scoreIds: [] });
  });

  describe("public list", () => {
    type Body = { items: { score: { scoreId: number }; leaderboard: { id: number } }[] };

    test("returns the player's pinned scores without signing in", async () => {
      const cookie = await signIn(ALICE);
      await insertScore(ALICE, TEST_LEADERBOARD_ID, 810_001);
      await pin(cookie, 810_001);

      const response = await send("GET", `/player/${ALICE}/pinned-scores`);
      expectStatus(response, 200);
      const body = (await response.json()) as Body;
      expect(body.items).toHaveLength(1);
      expect(body.items[0].score.scoreId).toBe(810_001);
      expect(body.items[0].leaderboard.id).toBe(TEST_LEADERBOARD_ID);
    });

    test("is empty for players without pins", async () => {
      expect(await (await send("GET", `/player/${ALICE}/pinned-scores`)).json()).toEqual({ items: [] });
    });

    test("keeps showing the exact pinned score after the player improves it", async () => {
      const cookie = await signIn(ALICE);
      await insertScore(ALICE, TEST_LEADERBOARD_ID, 810_001);
      await pin(cookie, 810_001);

      await archiveScore(810_001);
      await insertScore(ALICE, TEST_LEADERBOARD_ID, 810_002);

      const body = (await (await send("GET", `/player/${ALICE}/pinned-scores`)).json()) as Body;
      expect(body.items.map(item => item.score.scoreId)).toEqual([810_001]);
    });

    test("skips pins whose score is gone", async () => {
      const cookie = await signIn(ALICE);
      await insertScore(ALICE, TEST_LEADERBOARD_ID, 810_001);
      await pin(cookie, 810_001);
      await db.delete(scoreSaberScoresTable).where(eq(scoreSaberScoresTable.scoreId, 810_001));

      expect(await (await send("GET", `/player/${ALICE}/pinned-scores`)).json()).toEqual({ items: [] });
    });
  });
});
