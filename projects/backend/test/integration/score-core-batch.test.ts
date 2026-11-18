import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import type { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import type { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { beforeEach, describe, expect, test } from "bun:test";
import { HttpResponse } from "msw";
import { db } from "../../src/db";
import {
  scoreSaberLeaderboardRealmsTable,
  scoreSaberLeaderboardsTable,
  scoreSaberScoreHistoryTable,
  scoreSaberScoreRealmsTable,
  scoreSaberScoresTable,
} from "../../src/db/schema";
import { ScoreSaberLeaderboardsRepository } from "../../src/repositories/scoresaber-leaderboards.repository";
import { ScoreSaberScoresRepository } from "../../src/repositories/scoresaber-scores.repository";
import { ScoreCoreService } from "../../src/service/score/score-core.service";
import { server } from "../helpers/msw-server";
import { scoreSaberApi } from "../helpers/scoresaber-api.test-utils";

const EXTRA_REALM_IDS = [DEFAULT_REALM_ID + 1, DEFAULT_REALM_ID + 2];
const LEADERBOARD_ID = 920_001;
const OTHER_LEADERBOARD_ID = 920_002;
const BASE_TIME = new Date("2024-01-01T12:00:00Z");
const minutes = (offset: number) => new Date(BASE_TIME.getTime() + offset * 60_000);
const playerId = (index: number) => `92000000000000000000000000000${String(index).padStart(3, "0")}`;

beforeEach(() => {
  server.use(
    scoreSaberApi("/v2/realms", () =>
      HttpResponse.json(
        [DEFAULT_REALM_ID, ...EXTRA_REALM_IDS].map(id => ({
          id,
          name: `Realm ${id}`,
          startDate: BASE_TIME.toISOString(),
          endDate: null,
          isAcceptingScores: true,
          hasPP: true,
          hasHistory: true,
          decayFactor: 0.965,
        }))
      )
    ),
    scoreSaberApi("/v2/realms/:id/pp-curve", () =>
      HttpResponse.json({ curve: ScoreSaberCurve.DEFAULT_CURVE, positiveModifierCurve: [] })
    )
  );
});

async function seedLeaderboards() {
  const ids = [LEADERBOARD_ID, OTHER_LEADERBOARD_ID];
  await db.insert(scoreSaberLeaderboardsTable).values(
    ids.map(id => ({
      id,
      songHash: id.toString(16).padStart(32, "0"),
      songName: `Batch Song ${id}`,
      songSubName: "",
      songAuthorName: "Author",
      levelAuthorName: "Mapper",
      difficulty: "ExpertPlus" as const,
      characteristic: "Standard" as const,
      maxScore: 1000,
      plays: 0,
      dailyPlays: 0,
      seededScores: false,
      trendingScore: 1,
      timestamp: BASE_TIME,
    }))
  );
  await db.insert(scoreSaberLeaderboardRealmsTable).values(
    ids.flatMap(id =>
      [DEFAULT_REALM_ID, ...EXTRA_REALM_IDS].map(realmId => ({
        leaderboardId: id,
        realmId,
        ranked: !(id === OTHER_LEADERBOARD_ID && realmId === EXTRA_REALM_IDS[1]),
        qualified: false,
        stars: 6 + realmId,
        rankedDate: BASE_TIME,
      }))
    )
  );

  const leaderboards = await ScoreSaberLeaderboardsRepository.getLeaderboardsByIds(
    ids,
    true,
    DEFAULT_REALM_ID
  );
  return ids.map(id => leaderboards.find(leaderboard => leaderboard.id === id)!);
}

function makeScore(
  scoreId: number,
  player: number,
  leaderboard: ScoreSaberLeaderboard,
  score: number,
  timestamp: Date
) {
  const built: ScoreSaberScore = {
    playerId: playerId(player),
    leaderboardId: leaderboard.id,
    scoreId,
    difficulty: leaderboard.difficulty.difficulty,
    characteristic: leaderboard.difficulty.characteristic,
    score,
    accuracy: (score / leaderboard.maxScore) * 100,
    pp: score / 4,
    weight: 0,
    rank: 1,
    misses: 0,
    missedNotes: 0,
    badCuts: 0,
    maxCombo: 500,
    fullCombo: true,
    modifiers: [],
    hmd: "Unknown",
    rightController: null,
    leftController: null,
    timestamp,
  };
  return built;
}

function existingScores(a: ScoreSaberLeaderboard, b: ScoreSaberLeaderboard) {
  return [
    makeScore(5001, 1, a, 900, minutes(-60)),
    makeScore(5002, 2, a, 950, minutes(60)),
    makeScore(5003, 3, a, 800, minutes(0)),
    makeScore(5004, 4, a, 700, minutes(0)),
    makeScore(5011, 9, b, 600, minutes(-10)),
  ];
}

function incomingPage(a: ScoreSaberLeaderboard, b: ScoreSaberLeaderboard) {
  return [
    { score: makeScore(6000, 0, a, 500, minutes(0)), leaderboard: a },
    { score: makeScore(6001, 1, a, 910, minutes(0)), leaderboard: a },
    { score: makeScore(6002, 2, a, 920, minutes(0)), leaderboard: a },
    { score: makeScore(6003, 3, a, 850, minutes(0)), leaderboard: a },
    { score: makeScore(5004, 4, a, 700, minutes(0)), leaderboard: a },
    { score: makeScore(6005, 5, a, 400, minutes(0)), leaderboard: a },
    { score: makeScore(6006, 5, a, 450, minutes(5)), leaderboard: a },
    { score: makeScore(6007, 6, a, 300, minutes(0)), leaderboard: a },
    { score: makeScore(6007, 7, a, 310, minutes(0)), leaderboard: a },
    { score: makeScore(6009, 8, b, 200, minutes(0)), leaderboard: b },
    { score: makeScore(6010, 8, a, 250, minutes(0)), leaderboard: a },
    { score: makeScore(6011, 9, b, 650, minutes(0)), leaderboard: b },
  ];
}

async function resetAndSeedScores(a: ScoreSaberLeaderboard, b: ScoreSaberLeaderboard) {
  await db.delete(scoreSaberScoreRealmsTable);
  await db.delete(scoreSaberScoreHistoryTable);
  await db.delete(scoreSaberScoresTable);
  for (const score of existingScores(a, b)) {
    await ScoreSaberScoresRepository.insertScore(ScoreCoreService.toInsertRow(score), DEFAULT_REALM_ID);
  }
}

async function snapshot() {
  const withoutId = <T extends object>(rows: T[]) =>
    rows.map(row => {
      const { id: _id, ...rest } = row as T & { id?: number };
      return rest;
    });
  const [scores, realms, history] = await Promise.all([
    db.select().from(scoreSaberScoresTable),
    db.select().from(scoreSaberScoreRealmsTable),
    db.select().from(scoreSaberScoreHistoryTable),
  ]);
  const byScore = <T extends { scoreId: number }>(rows: T[]) =>
    [...rows].sort((x, y) => x.scoreId - y.scoreId || JSON.stringify(x).localeCompare(JSON.stringify(y)));
  return {
    scores: byScore(withoutId(scores)),
    realms: byScore(withoutId(realms)).sort((x, y) => x.realmId - y.realmId || x.scoreId - y.scoreId),
    history: byScore(withoutId(history)),
  };
}

describe("ScoreCoreService.trackScoreSaberScoresBatch", () => {
  test("leaves the same rows and returns the same results as tracking each score on its own", async () => {
    const [a, b] = await seedLeaderboards();

    await resetAndSeedScores(a, b);
    const sequentialResults = [];
    for (const { score, leaderboard } of incomingPage(a, b)) {
      const result = await ScoreCoreService.trackScoreSaberScore(score, leaderboard, false);
      sequentialResults.push({ tracked: result.tracked, hasPreviousScore: result.hasPreviousScore });
    }
    const sequential = await snapshot();

    expect(sequentialResults.filter(result => result.tracked).length).toBeGreaterThan(6);
    expect(sequentialResults.some(result => result.hasPreviousScore)).toBe(true);
    expect(sequential.history.length).toBeGreaterThan(0);
    expect(sequential.realms.some(row => row.realmId === EXTRA_REALM_IDS[0])).toBe(true);

    await resetAndSeedScores(a, b);
    const batchResults = (await ScoreCoreService.trackScoreSaberScoresBatch(incomingPage(a, b))).map(
      result => ({ tracked: result.tracked, hasPreviousScore: result.hasPreviousScore })
    );
    const batched = await snapshot();

    expect(batchResults).toEqual(sequentialResults);
    expect(batched.scores).toEqual(sequential.scores);
    expect(batched.realms).toEqual(sequential.realms);
    expect(batched.history).toEqual(sequential.history);
  });

  test("returns nothing for an empty page", async () => {
    expect(await ScoreCoreService.trackScoreSaberScoresBatch([])).toEqual([]);
  });

  test("ingesting the same page twice stores nothing new the second time", async () => {
    const [a, b] = await seedLeaderboards();
    await resetAndSeedScores(a, b);
    const fresh = incomingPage(a, b).filter(entry => [6000, 6005, 6009, 6010].includes(entry.score.scoreId));

    const first = await ScoreCoreService.trackScoreSaberScoresBatch(fresh);
    expect(first.every(result => result.tracked)).toBe(true);
    const afterFirst = await snapshot();

    const second = await ScoreCoreService.trackScoreSaberScoresBatch(fresh);
    expect(second.every(result => !result.tracked)).toBe(true);
    expect(await snapshot()).toEqual(afterFirst);
  });
});
