import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import type { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import type { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
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
import { RealmService } from "../../src/service/realm/realm.service";
import { ScoreCoreService } from "../../src/service/score/score-core.service";

const EXTRA_REALM_IDS = [DEFAULT_REALM_ID + 1, DEFAULT_REALM_ID + 2];
const LEADERBOARD_ID = 920_001;
const OTHER_LEADERBOARD_ID = 920_002;
const BASE_TIME = new Date("2024-01-01T12:00:00Z");
const minutes = (offset: number): Date => new Date(BASE_TIME.getTime() + offset * 60_000);
const playerId = (index: number): string => `92000000000000000000000000000${String(index).padStart(3, "0")}`;

let realmIdsSpy: ReturnType<typeof spyOn>;
let curveSpy: ReturnType<typeof spyOn>;

beforeEach(() => {
  realmIdsSpy = spyOn(RealmService, "getRealmIds").mockResolvedValue([DEFAULT_REALM_ID, ...EXTRA_REALM_IDS]);
  curveSpy = spyOn(RealmService, "getCalculationCurve").mockResolvedValue(ScoreSaberCurve.DEFAULT_CURVE);
});

afterEach(() => {
  realmIdsSpy.mockRestore();
  curveSpy.mockRestore();
});

async function seedLeaderboards(): Promise<ScoreSaberLeaderboard[]> {
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
        // The second leaderboard is unranked in the last realm, so its pp is skipped there
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
): ScoreSaberScore {
  return {
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
}

/** Scores already stored before the page is ingested. */
function existingScores(a: ScoreSaberLeaderboard, b: ScoreSaberLeaderboard): ScoreSaberScore[] {
  return [
    makeScore(5001, 1, a, 900, minutes(-60)), // replaced by a newer play
    makeScore(5002, 2, a, 950, minutes(60)), // newer than the incoming play
    makeScore(5003, 3, a, 800, minutes(0)), // same timestamp as the incoming play, lower score
    makeScore(5004, 4, a, 700, minutes(0)), // the incoming page repeats this exact score
    makeScore(5011, 9, b, 600, minutes(-10)), // current score on the other leaderboard
  ];
}

/** The page being ingested, in order. */
function incomingPage(a: ScoreSaberLeaderboard, b: ScoreSaberLeaderboard) {
  return [
    { score: makeScore(6000, 0, a, 500, minutes(0)), leaderboard: a }, // fresh
    { score: makeScore(6001, 1, a, 910, minutes(0)), leaderboard: a }, // replaces the current score
    { score: makeScore(6002, 2, a, 920, minutes(0)), leaderboard: a }, // older than the current score
    { score: makeScore(6003, 3, a, 850, minutes(0)), leaderboard: a }, // same timestamp, higher score
    { score: makeScore(5004, 4, a, 700, minutes(0)), leaderboard: a }, // already stored
    { score: makeScore(6005, 5, a, 400, minutes(0)), leaderboard: a }, // fresh...
    { score: makeScore(6006, 5, a, 450, minutes(5)), leaderboard: a }, // ...and the same player again
    { score: makeScore(6007, 6, a, 300, minutes(0)), leaderboard: a }, // fresh...
    { score: makeScore(6007, 7, a, 310, minutes(0)), leaderboard: a }, // ...and the same score id again
    { score: makeScore(6009, 8, b, 200, minutes(0)), leaderboard: b }, // fresh on the other leaderboard
    { score: makeScore(6010, 8, a, 250, minutes(0)), leaderboard: a }, // same player, fresh on this one
    { score: makeScore(6011, 9, b, 650, minutes(0)), leaderboard: b }, // replaces on the other leaderboard
  ];
}

async function resetAndSeedScores(a: ScoreSaberLeaderboard, b: ScoreSaberLeaderboard): Promise<void> {
  await db.delete(scoreSaberScoreRealmsTable);
  await db.delete(scoreSaberScoreHistoryTable);
  await db.delete(scoreSaberScoresTable);
  for (const score of existingScores(a, b)) {
    await ScoreSaberScoresRepository.insertScore(ScoreCoreService.toInsertRow(score), DEFAULT_REALM_ID);
  }
}

async function snapshot() {
  const withoutId = <T extends object>(rows: T[]): Omit<T, "id">[] =>
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

    // The scenario has to exercise the interesting paths, otherwise the comparison proves little
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
