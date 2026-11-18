import type { BeatLeaderScoreToken } from "@ssr/common/schemas/beatleader/tokens/score/score";
import { afterEach, describe, expect, test } from "bun:test";
import { inArray } from "drizzle-orm";
import { HttpResponse, http } from "msw";
import { db } from "../../src/db";
import { beatLeaderScoresTable } from "../../src/db/schema";
import BeatLeaderService from "../../src/service/beatleader/beatleader.service";
import { TEST_PLAYER_ID } from "../helpers/constants";
import { server } from "../helpers/msw-server";

const FIRST_ID = 930_000;
const SCORE_STATS_CDN = "https://cdn.scorestats.beatleader.xyz";

afterEach(async () => {
  await db.delete(beatLeaderScoresTable).where(inArray(beatLeaderScoresTable.id, ids()));
});

function recordScoreStatsRequests() {
  const requestedIds: number[] = [];
  const waiters: { count: number; resolve: () => void }[] = [];

  server.use(
    http.get(`${SCORE_STATS_CDN}/:file`, ({ params }) => {
      requestedIds.push(Number.parseInt(String(params.file), 10));
      for (const waiter of waiters) {
        if (requestedIds.length >= waiter.count) {
          waiter.resolve();
        }
      }
      return new HttpResponse(null, { status: 404 });
    })
  );

  return {
    requestedIds,
    reached(count: number) {
      return new Promise<void>(resolve => {
        if (requestedIds.length >= count) {
          resolve();
          return;
        }
        waiters.push({ count, resolve });
      });
    },
  };
}

const ids = () => Array.from({ length: 12 }, (_, i) => FIRST_ID + i);

function token(id: number, patch: Record<string, unknown> = {}) {
  return {
    id,
    playerId: TEST_PLAYER_ID,
    baseScore: 800_000 + id,
    modifiedScore: 800_000 + id,
    accuracy: 0.9,
    pp: 100,
    weight: 1,
    rank: 5,
    country: "US",
    fcAccuracy: 0.91,
    fcPp: 110,
    replay: "",
    modifiers: "",
    badCuts: id % 3,
    missedNotes: id % 4,
    bombCuts: id % 2,
    wallsHit: 1,
    pauses: 2,
    fullCombo: id % 2 === 0,
    platform: "steam",
    maxCombo: 500,
    maxStreak: null,
    hmd: 64,
    controller: 1,
    leaderboardId: `lb${id % 3}`,
    timeset: String(1_700_000_000 + id * 60),
    timepost: 1_700_000_000 + id * 60,
    accLeft: 100,
    accRight: 101,
    leaderboard: {
      id: `lb${id % 3}`,
      song: { hash: `abcdef${id % 3}`, name: "Song", subName: "", author: "A", mapper: "M" },
      difficulty: { difficultyName: "ExpertPlus", modeName: "Standard", value: 9, mode: 1, stars: 7 },
    },
    scoreImprovement:
      id % 2 === 0
        ? {
            timeset: "0",
            score: 10,
            accuracy: 0.01,
            pp: 1,
            rank: 1,
            accRight: 1,
            accLeft: 1,
            averageRankedAccuracy: 0.01,
            totalScore: 10,
            pauses: 0,
            badCuts: 0,
            missedNotes: 0,
            bombCuts: 0,
            wallsHit: 0,
            maxCombo: 0,
            maxStreak: 0,
            fcAccuracy: 0,
            fcPp: 0,
            modifiers: "",
            id: 0,
          }
        : null,
    ...patch,
  } as unknown as BeatLeaderScoreToken;
}

async function rows() {
  const all = await db.select().from(beatLeaderScoresTable).where(inArray(beatLeaderScoresTable.id, ids()));
  return all.sort((a, b) => a.id - b.id);
}

describe("BeatLeaderService.trackBeatLeaderScoresBatch", () => {
  test("stores the same rows as tracking each score on its own", async () => {
    const tokens = [
      token(FIRST_ID),
      token(FIRST_ID + 1),
      token(FIRST_ID + 2),
      token(FIRST_ID + 2),
      token(FIRST_ID + 3),
      token(FIRST_ID + 4),
    ];
    const statsRequests = recordScoreStatsRequests();
    await BeatLeaderService.trackBeatLeaderScore(tokens[1], false, false, TEST_PLAYER_ID);
    await statsRequests.reached(1);
    const before = await rows();
    expect(before).toHaveLength(1);

    let sequentialCount = 0;
    for (const t of tokens) {
      if (before.some(r => r.id === t.id)) {
        continue;
      }
      if (await BeatLeaderService.trackBeatLeaderScore(t, false, false, TEST_PLAYER_ID)) {
        sequentialCount++;
      }
    }
    const sequential = await rows();
    await statsRequests.reached(sequential.length);
    const sequentialStats = [...statsRequests.requestedIds].sort();
    expect(sequential.length).toBeGreaterThan(3);

    await db.delete(beatLeaderScoresTable).where(inArray(beatLeaderScoresTable.id, ids()));
    statsRequests.requestedIds.splice(0);
    await BeatLeaderService.trackBeatLeaderScore(tokens[1], false, false, TEST_PLAYER_ID);
    await statsRequests.reached(1);
    statsRequests.requestedIds.splice(0);

    const batchCount = await BeatLeaderService.trackBeatLeaderScoresBatch(tokens, TEST_PLAYER_ID);
    const batched = await rows();
    await statsRequests.reached(batched.length - 1);

    expect(batched).toEqual(sequential);
    expect(batchCount).toBe(sequentialCount);
    expect([...statsRequests.requestedIds].sort()).toEqual(sequentialStats.filter(id => id !== FIRST_ID + 1));
  });

  test("tracks nothing for an untracked account or an empty page", async () => {
    expect(await BeatLeaderService.trackBeatLeaderScoresBatch([], TEST_PLAYER_ID)).toBe(0);
    expect(await BeatLeaderService.trackBeatLeaderScoresBatch([token(FIRST_ID)], "999999999999999")).toBe(0);
    expect(await rows()).toHaveLength(0);
  });
});
