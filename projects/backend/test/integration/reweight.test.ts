import { env } from "@ssr/common/env";
import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import type {
  PlayerReweightScoresResponse,
  PlayerReweightsResponse,
  ReweightMarkersResponse,
  ReweightPlayersPageResponse,
  ReweightResponse,
  ReweightsPageResponse,
} from "@ssr/common/schemas/reweight/reweight-responses";
import type { ScoreSaberV2LeaderboardScoresPageToken } from "@ssr/common/schemas/scoresaber/tokens/v2/leaderboard/leaderboard-scores-page";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { and, eq } from "drizzle-orm";
import { db } from "../../src/db";
import {
  scoreSaberLeaderboardStarChangeTable,
  scoreSaberReweightPlayersTable,
  scoreSaberReweightScoresTable,
  scoreSaberReweightsTable,
  scoreSaberScoreRealmsTable,
  scoreSaberScoresTable,
} from "../../src/db/schema";
import { ScoreSaberLeaderboardsRepository } from "../../src/repositories/scoresaber-leaderboards.repository";
import { ScoreSaberReweightRepository } from "../../src/repositories/scoresaber-reweight.repository";
import { ScoreSaberApiService } from "../../src/service/external/scoresaber-api.service";
import { buildRankedBatchMessage } from "../../src/service/leaderboard/leaderboard-ranked-batch-notifications.service";
import { LeaderboardRankedSyncService } from "../../src/service/leaderboard/leaderboard-ranked-sync.service";
import { RealmScoreSyncService } from "../../src/service/realm/realm-score-sync.service";
import { ReweightService } from "../../src/service/reweight/reweight.service";
import {
  expectNotFound,
  expectPaginationMetadata,
  expectStatus,
  expectValidationError,
} from "../helpers/assertions";
import {
  TEST_INACTIVE_PLAYER_ID,
  TEST_LEADERBOARD_ID,
  TEST_LEADERBOARD_QUALIFIED_ID,
  TEST_PLAYER_ID,
  TEST_PLAYER_TWO_ID,
  TEST_SCORE_ID,
  TEST_SCORE_TWO_ID,
  UNKNOWN_PLAYER_ID,
} from "../helpers/constants";
import { createTestApp } from "../helpers/create-test-app";
import { request } from "../helpers/request";

const DAY = 24 * 60 * 60 * 1000;
const BASE = new Date("2026-01-10T00:00:00.000Z");
const EXTRA_SCORE_ID = 900_010;
const UNSTORED_SCORE_ID = 999_001;

/** ScoreSaber's pp for scores by leaderboard, served by the stubbed realm scores lookup. */
type StubbedScores = Map<number, { id: number; pp: number }[]>;

const originalLookupLeaderboardRealmScores = ScoreSaberApiService.lookupLeaderboardRealmScores;
const originalGetAllLeaderboards = ScoreSaberApiService.getAllLeaderboards;

/**
 * Replaces ScoreSaber's realm scores lookup.
 *
 * @param scores the scores each leaderboard returns
 * @param options.pageSize how many scores fit on a page
 * @param options.failingLeaderboardIds leaderboards whose lookup fails
 */
function stubRealmScores(
  scores: StubbedScores,
  options: { pageSize?: number; failingLeaderboardIds?: Set<number> } = {}
): { calls: number[] } {
  const { pageSize = 100, failingLeaderboardIds = new Set<number>() } = options;
  const calls: number[] = [];

  ScoreSaberApiService.lookupLeaderboardRealmScores = async (
    leaderboardId,
    page
  ): Promise<ScoreSaberV2LeaderboardScoresPageToken | undefined> => {
    calls.push(leaderboardId);
    if (failingLeaderboardIds.has(leaderboardId)) {
      return undefined;
    }
    const all = scores.get(leaderboardId) ?? [];
    return {
      data: all.slice((page - 1) * pageSize, page * pageSize).map(score => ({
        id: score.id,
        pp: score.pp,
        personalBest: true,
        player: { id: "" },
      })),
      metadata: {
        page,
        itemsPerPage: pageSize,
        totalItems: all.length,
        totalPages: Math.max(Math.ceil(all.length / pageSize), 1),
      },
    };
  };
  return { calls };
}

/** Gives the first player a second ranked score worth 100 pp, which no reweight changes. */
async function seedUnchangedScore(): Promise<void> {
  await db.insert(scoreSaberScoresTable).values({
    scoreId: EXTRA_SCORE_ID,
    playerId: TEST_PLAYER_ID,
    leaderboardId: TEST_LEADERBOARD_QUALIFIED_ID,
    difficulty: "Expert",
    characteristic: "Standard",
    score: 800,
    accuracy: 0.9,
    medals: 0,
    missedNotes: 0,
    badCuts: 0,
    maxCombo: 400,
    fullCombo: true,
    modifiers: [],
    timestamp: BASE,
  });
  await db.insert(scoreSaberScoreRealmsTable).values({
    scoreId: EXTRA_SCORE_ID,
    realmId: DEFAULT_REALM_ID,
    playerId: TEST_PLAYER_ID,
    leaderboardId: TEST_LEADERBOARD_QUALIFIED_ID,
    pp: 100,
  });
}

async function getRealmPp(scoreId: number): Promise<number | undefined> {
  const [row] = await db
    .select({ pp: scoreSaberScoreRealmsTable.pp })
    .from(scoreSaberScoreRealmsTable)
    .where(
      and(
        eq(scoreSaberScoreRealmsTable.scoreId, scoreId),
        eq(scoreSaberScoreRealmsTable.realmId, DEFAULT_REALM_ID)
      )
    );
  return row?.pp;
}

async function getReweightRows() {
  return db.select().from(scoreSaberReweightsTable).orderBy(scoreSaberReweightsTable.id);
}

/** Records a star change on the seeded ranked leaderboard and returns its reweight id. */
async function recordSeededStarChange(
  timestamp: Date = BASE,
  previousStars = 8.5,
  newStars = 9
): Promise<number> {
  const recorded = await ReweightService.recordStarChanges(DEFAULT_REALM_ID, [
    { leaderboardId: TEST_LEADERBOARD_ID, previousStars, newStars, timestamp },
  ]);
  if (!recorded) {
    throw new Error("Expected the star change to be recorded in a reweight");
  }
  return recorded.reweightId;
}

afterEach(() => {
  ScoreSaberApiService.lookupLeaderboardRealmScores = originalLookupLeaderboardRealmScores;
  ScoreSaberApiService.getAllLeaderboards = originalGetAllLeaderboards;
});

describe("ReweightService.recordStarChanges", () => {
  test("starts a reweight for the first star changes", async () => {
    const recorded = await ReweightService.recordStarChanges(DEFAULT_REALM_ID, [
      { leaderboardId: TEST_LEADERBOARD_ID, previousStars: 8.5, newStars: 9, timestamp: BASE },
      {
        leaderboardId: TEST_LEADERBOARD_QUALIFIED_ID,
        previousStars: 6,
        newStars: 7,
        timestamp: new Date(BASE.getTime() + 1000),
      },
    ]);

    expect(recorded?.isNew).toBe(true);
    expect(recorded?.alreadyNotified).toBe(false);

    const [reweight] = await getReweightRows();
    expect(recorded).toBeDefined();
    expect(reweight?.id).toBe(recorded?.reweightId as number);
    expect(reweight?.startedAt).toEqual(BASE);
    expect(reweight?.endedAt).toEqual(new Date(BASE.getTime() + 1000));
    expect(reweight?.leaderboardCount).toBe(2);
    expect(reweight?.notifiedAt).toBeNull();

    const changes = await db
      .select()
      .from(scoreSaberLeaderboardStarChangeTable)
      .where(eq(scoreSaberLeaderboardStarChangeTable.reweightId, reweight!.id));
    expect(changes).toHaveLength(2);
    expect(changes.every(change => change.ppPending)).toBe(true);
  });

  test("merges star changes made within the merge window into the same reweight", async () => {
    const first = await recordSeededStarChange(BASE);
    const second = await ReweightService.recordStarChanges(DEFAULT_REALM_ID, [
      {
        leaderboardId: TEST_LEADERBOARD_QUALIFIED_ID,
        previousStars: 6,
        newStars: 7,
        timestamp: new Date(BASE.getTime() + 2 * DAY),
      },
    ]);

    expect(second?.isNew).toBe(false);
    expect(second?.reweightId).toBe(first);

    const reweights = await getReweightRows();
    expect(reweights).toHaveLength(1);
    expect(reweights[0]?.startedAt).toEqual(BASE);
    expect(reweights[0]?.endedAt).toEqual(new Date(BASE.getTime() + 2 * DAY));
    expect(reweights[0]?.leaderboardCount).toBe(2);
  });

  test("keeps merging while changes keep arriving inside the window", async () => {
    const first = await recordSeededStarChange(BASE);
    await recordSeededStarChange(new Date(BASE.getTime() + 2.5 * DAY), 9, 9.5);
    const third = await recordSeededStarChange(new Date(BASE.getTime() + 5 * DAY), 9.5, 10);

    expect(third).toBe(first);
    expect(await getReweightRows()).toHaveLength(1);
  });

  test("starts a new reweight once the window has passed", async () => {
    const first = await recordSeededStarChange(BASE);
    const later = await ReweightService.recordStarChanges(DEFAULT_REALM_ID, [
      {
        leaderboardId: TEST_LEADERBOARD_ID,
        previousStars: 9,
        newStars: 9.5,
        timestamp: new Date(BASE.getTime() + 3 * DAY + 1000),
      },
    ]);

    expect(later?.isNew).toBe(true);
    expect(later?.reweightId).not.toBe(first);
    expect(await getReweightRows()).toHaveLength(2);
  });

  test("counts a map that was re-rated twice once", async () => {
    await recordSeededStarChange(BASE, 8, 8.5);
    await recordSeededStarChange(new Date(BASE.getTime() + DAY), 8.5, 9);

    const [reweight] = await getReweightRows();
    expect(reweight?.leaderboardCount).toBe(1);
  });

  test("reports a merge into an announced reweight so it is not announced again", async () => {
    const reweightId = await recordSeededStarChange(BASE);
    await ReweightService.markNotified(reweightId);

    const merged = await ReweightService.recordStarChanges(DEFAULT_REALM_ID, [
      {
        leaderboardId: TEST_LEADERBOARD_QUALIFIED_ID,
        previousStars: 6,
        newStars: 7,
        timestamp: new Date(BASE.getTime() + DAY),
      },
    ]);

    expect(merged?.reweightId).toBe(reweightId);
    expect(merged?.alreadyNotified).toBe(true);
  });

  test("does not create reweights for other realms", async () => {
    const recorded = await ReweightService.recordStarChanges(2, [
      { leaderboardId: TEST_LEADERBOARD_ID, previousStars: 8, newStars: 9, timestamp: BASE },
    ]);

    expect(recorded).toBeUndefined();
    expect(await getReweightRows()).toHaveLength(0);

    const [change] = await db
      .select()
      .from(scoreSaberLeaderboardStarChangeTable)
      .where(eq(scoreSaberLeaderboardStarChangeTable.realmId, 2));
    expect(change?.reweightId).toBeNull();
    expect(change?.ppPending).toBe(false);
  });

  test("records nothing for no star changes", async () => {
    expect(await ReweightService.recordStarChanges(DEFAULT_REALM_ID, [])).toBeUndefined();
    expect(await getReweightRows()).toHaveLength(0);
  });
});

describe("ReweightService.processPendingPpChanges", () => {
  test("captures the pp change of every changed score and player", async () => {
    await seedUnchangedScore();
    const reweightId = await recordSeededStarChange();
    stubRealmScores(
      new Map([
        [
          TEST_LEADERBOARD_ID,
          [
            { id: TEST_SCORE_ID, pp: 300 },
            { id: TEST_SCORE_TWO_ID, pp: 150 },
          ],
        ],
      ])
    );

    await ReweightService.processPendingPpChanges();

    const scores = await db
      .select()
      .from(scoreSaberReweightScoresTable)
      .where(eq(scoreSaberReweightScoresTable.reweightId, reweightId))
      .orderBy(scoreSaberReweightScoresTable.scoreId);
    expect(scores).toHaveLength(2);
    expect(scores[0]).toMatchObject({
      scoreId: TEST_SCORE_ID,
      playerId: TEST_PLAYER_ID,
      leaderboardId: TEST_LEADERBOARD_ID,
      ppBefore: 250,
      ppAfter: 300,
    });
    expect(scores[1]).toMatchObject({ scoreId: TEST_SCORE_TWO_ID, ppBefore: 200, ppAfter: 150 });

    // The stored pp is now what ScoreSaber reports.
    expect(await getRealmPp(TEST_SCORE_ID)).toBe(300);
    expect(await getRealmPp(TEST_SCORE_TWO_ID)).toBe(150);

    const players = await db
      .select()
      .from(scoreSaberReweightPlayersTable)
      .where(eq(scoreSaberReweightPlayersTable.reweightId, reweightId));
    const playerOne = players.find(player => player.playerId === TEST_PLAYER_ID);
    const playerTwo = players.find(player => player.playerId === TEST_PLAYER_TWO_ID);

    // 250 -> 300 on top of an unchanged 100: (250 + 0.965 * 100) -> (300 + 0.965 * 100)
    expect(playerOne?.ppBefore).toBeCloseTo(250 + 0.965 * 100, 6);
    expect(playerOne?.ppAfter).toBeCloseTo(300 + 0.965 * 100, 6);
    expect(playerOne?.ppDelta).toBeCloseTo(50, 6);
    expect(playerOne?.scoresChanged).toBe(1);
    expect(playerTwo?.ppDelta).toBeCloseTo(-50, 6);

    const [reweight] = await getReweightRows();
    expect(reweight?.playerCount).toBe(2);
    expect(reweight?.scoreCount).toBe(2);

    const pending = await db
      .select()
      .from(scoreSaberLeaderboardStarChangeTable)
      .where(eq(scoreSaberLeaderboardStarChangeTable.ppPending, true));
    expect(pending).toHaveLength(0);
  });

  test("ranks a lowered score below the player's other scores", async () => {
    await seedUnchangedScore();
    const reweightId = await recordSeededStarChange();
    stubRealmScores(new Map([[TEST_LEADERBOARD_ID, [{ id: TEST_SCORE_ID, pp: 80 }]]]));

    await ReweightService.processPendingPpChanges();

    const [player] = await db
      .select()
      .from(scoreSaberReweightPlayersTable)
      .where(
        and(
          eq(scoreSaberReweightPlayersTable.reweightId, reweightId),
          eq(scoreSaberReweightPlayersTable.playerId, TEST_PLAYER_ID)
        )
      );
    // The 100 pp score is now the best one: 250 + 96.5 -> 100 + 0.965 * 80
    expect(player?.ppBefore).toBeCloseTo(250 + 0.965 * 100, 6);
    expect(player?.ppAfter).toBeCloseTo(100 + 0.965 * 80, 6);
  });

  test("skips scores whose pp did not change", async () => {
    await recordSeededStarChange();
    stubRealmScores(
      new Map([
        [
          TEST_LEADERBOARD_ID,
          [
            { id: TEST_SCORE_ID, pp: 250 },
            { id: TEST_SCORE_TWO_ID, pp: 200 },
          ],
        ],
      ])
    );

    await ReweightService.processPendingPpChanges();

    expect(await db.select().from(scoreSaberReweightScoresTable)).toHaveLength(0);
    expect(await db.select().from(scoreSaberReweightPlayersTable)).toHaveLength(0);
    const [reweight] = await getReweightRows();
    expect(reweight?.scoreCount).toBe(0);
    expect(reweight?.playerCount).toBe(0);
  });

  test("ignores scores that are not stored", async () => {
    await recordSeededStarChange();
    stubRealmScores(
      new Map([
        [
          TEST_LEADERBOARD_ID,
          [
            { id: UNSTORED_SCORE_ID, pp: 400 },
            { id: TEST_SCORE_ID, pp: 260 },
          ],
        ],
      ])
    );

    await ReweightService.processPendingPpChanges();

    const scores = await db.select().from(scoreSaberReweightScoresTable);
    expect(scores.map(score => score.scoreId)).toEqual([TEST_SCORE_ID]);
    expect(await getRealmPp(UNSTORED_SCORE_ID)).toBeUndefined();
  });

  test("reads every page of a leaderboard's scores", async () => {
    await recordSeededStarChange();
    const { calls } = stubRealmScores(
      new Map([
        [
          TEST_LEADERBOARD_ID,
          [
            { id: TEST_SCORE_ID, pp: 260 },
            { id: TEST_SCORE_TWO_ID, pp: 210 },
          ],
        ],
      ]),
      { pageSize: 1 }
    );

    await ReweightService.processPendingPpChanges();

    expect(calls).toEqual([TEST_LEADERBOARD_ID, TEST_LEADERBOARD_ID]);
    expect(await db.select().from(scoreSaberReweightScoresTable)).toHaveLength(2);
  });

  test("stores a score that stopped being worth pp and removes its pp row", async () => {
    const reweightId = await recordSeededStarChange();
    stubRealmScores(new Map([[TEST_LEADERBOARD_ID, [{ id: TEST_SCORE_ID, pp: 0 }]]]));

    await ReweightService.processPendingPpChanges();

    const [score] = await db
      .select()
      .from(scoreSaberReweightScoresTable)
      .where(eq(scoreSaberReweightScoresTable.reweightId, reweightId));
    expect(score).toMatchObject({ ppBefore: 250, ppAfter: 0 });
    expect(await getRealmPp(TEST_SCORE_ID)).toBeUndefined();

    const [player] = await db
      .select()
      .from(scoreSaberReweightPlayersTable)
      .where(eq(scoreSaberReweightPlayersTable.playerId, TEST_PLAYER_ID));
    expect(player?.ppBefore).toBeCloseTo(250, 6);
    expect(player?.ppAfter).toBe(0);
  });

  test("leaves a leaderboard pending when ScoreSaber cannot be reached and retries it", async () => {
    await recordSeededStarChange();
    stubRealmScores(new Map(), { failingLeaderboardIds: new Set([TEST_LEADERBOARD_ID]) });

    await ReweightService.processPendingPpChanges();

    expect(await db.select().from(scoreSaberReweightScoresTable)).toHaveLength(0);
    expect(await getRealmPp(TEST_SCORE_ID)).toBe(250);
    const [pending] = await db
      .select()
      .from(scoreSaberLeaderboardStarChangeTable)
      .where(eq(scoreSaberLeaderboardStarChangeTable.ppPending, true));
    expect(pending?.leaderboardId).toBe(TEST_LEADERBOARD_ID);

    stubRealmScores(new Map([[TEST_LEADERBOARD_ID, [{ id: TEST_SCORE_ID, pp: 300 }]]]));
    await ReweightService.processPendingPpChanges();

    const [score] = await db.select().from(scoreSaberReweightScoresTable);
    expect(score).toMatchObject({ scoreId: TEST_SCORE_ID, ppBefore: 250, ppAfter: 300 });
    expect(
      await db
        .select()
        .from(scoreSaberLeaderboardStarChangeTable)
        .where(eq(scoreSaberLeaderboardStarChangeTable.ppPending, true))
    ).toHaveLength(0);
  });

  test("keeps the original pp before when a capture is repeated after the stored pp was overwritten", async () => {
    const reweightId = await recordSeededStarChange();
    // A previous attempt recorded the change and overwrote the stored pp, then crashed.
    await db.insert(scoreSaberReweightScoresTable).values({
      reweightId,
      scoreId: TEST_SCORE_ID,
      playerId: TEST_PLAYER_ID,
      leaderboardId: TEST_LEADERBOARD_ID,
      ppBefore: 250,
      ppAfter: 280,
    });
    await db
      .update(scoreSaberScoreRealmsTable)
      .set({ pp: 280 })
      .where(eq(scoreSaberScoreRealmsTable.scoreId, TEST_SCORE_ID));
    stubRealmScores(new Map([[TEST_LEADERBOARD_ID, [{ id: TEST_SCORE_ID, pp: 300 }]]]));

    await ReweightService.processPendingPpChanges();

    const [score] = await db.select().from(scoreSaberReweightScoresTable);
    expect(score).toMatchObject({ ppBefore: 250, ppAfter: 300 });
  });

  test("does nothing when no star change is pending", async () => {
    const { calls } = stubRealmScores(new Map());

    await ReweightService.processPendingPpChanges();

    expect(calls).toHaveLength(0);
  });

  test("does not touch star changes that are not pending, such as seeded ones", async () => {
    const reweightId = await recordSeededStarChange();
    await db
      .update(scoreSaberLeaderboardStarChangeTable)
      .set({ ppPending: false })
      .where(eq(scoreSaberLeaderboardStarChangeTable.reweightId, reweightId));
    const { calls } = stubRealmScores(new Map([[TEST_LEADERBOARD_ID, [{ id: TEST_SCORE_ID, pp: 999 }]]]));

    await ReweightService.processPendingPpChanges();

    expect(calls).toHaveLength(0);
    expect(await getRealmPp(TEST_SCORE_ID)).toBe(250);
  });

  test("adds the pp changes of a leaderboard merged in later without losing the earlier ones", async () => {
    await seedUnchangedScore();
    const reweightId = await recordSeededStarChange(BASE);
    stubRealmScores(new Map([[TEST_LEADERBOARD_ID, [{ id: TEST_SCORE_ID, pp: 300 }]]]));
    await ReweightService.processPendingPpChanges();

    await ReweightService.recordStarChanges(DEFAULT_REALM_ID, [
      {
        leaderboardId: TEST_LEADERBOARD_QUALIFIED_ID,
        previousStars: 6,
        newStars: 7,
        timestamp: new Date(BASE.getTime() + DAY),
      },
    ]);
    stubRealmScores(new Map([[TEST_LEADERBOARD_QUALIFIED_ID, [{ id: EXTRA_SCORE_ID, pp: 140 }]]]));
    await ReweightService.processPendingPpChanges();

    const scores = await db
      .select()
      .from(scoreSaberReweightScoresTable)
      .where(eq(scoreSaberReweightScoresTable.reweightId, reweightId));
    expect(scores.map(score => score.scoreId).sort()).toEqual([TEST_SCORE_ID, EXTRA_SCORE_ID].sort());

    // Both scores changed: (250, 100) -> (300, 140)
    const [player] = await db
      .select()
      .from(scoreSaberReweightPlayersTable)
      .where(
        and(
          eq(scoreSaberReweightPlayersTable.reweightId, reweightId),
          eq(scoreSaberReweightPlayersTable.playerId, TEST_PLAYER_ID)
        )
      );
    expect(player?.ppBefore).toBeCloseTo(250 + 0.965 * 100, 6);
    expect(player?.ppAfter).toBeCloseTo(300 + 0.965 * 140, 6);
    expect(player?.scoresChanged).toBe(2);
  });
});

describe("LeaderboardRankedSyncService.refreshRankedLeaderboards", () => {
  /** Makes ScoreSaber report the seeded ranked leaderboard with different stars. */
  async function stubRerate(stars: number): Promise<void> {
    const [stored] = await ScoreSaberLeaderboardsRepository.getRankedLeaderboards(DEFAULT_REALM_ID);
    if (!stored) {
      throw new Error("Expected a seeded ranked leaderboard");
    }
    ScoreSaberApiService.getAllLeaderboards = async () => ({
      leaderboards: [{ ...stored, stars }],
      leaderboardDifficulties: new Map(),
      complete: true,
    });
  }

  test("records a re-rated leaderboard as a reweight and captures its pp changes", async () => {
    await stubRerate(9);
    stubRealmScores(new Map([[TEST_LEADERBOARD_ID, [{ id: TEST_SCORE_ID, pp: 310 }]]]));

    const result = await LeaderboardRankedSyncService.refreshRankedLeaderboards();

    expect(result.updates).toHaveLength(1);
    expect(result.reweight?.isNew).toBe(true);
    expect(result.reweight?.alreadyNotified).toBe(false);

    const [change] = await db
      .select()
      .from(scoreSaberLeaderboardStarChangeTable)
      .where(eq(scoreSaberLeaderboardStarChangeTable.previousStars, 8.5));
    expect(change).toMatchObject({
      leaderboardId: TEST_LEADERBOARD_ID,
      newStars: 9,
      reweightId: result.reweight?.reweightId,
      ppPending: false,
    });

    const [leaderboard] = await ScoreSaberLeaderboardsRepository.getRankedLeaderboards(DEFAULT_REALM_ID);
    expect(leaderboard?.stars).toBe(9);

    const [score] = await db.select().from(scoreSaberReweightScoresTable);
    expect(score).toMatchObject({ ppBefore: 250, ppAfter: 310 });
    expect(await getRealmPp(TEST_SCORE_ID)).toBe(310);
  });

  test("merges a second sync inside the window into the same reweight", async () => {
    await stubRerate(9);
    stubRealmScores(new Map([[TEST_LEADERBOARD_ID, [{ id: TEST_SCORE_ID, pp: 310 }]]]));
    const first = await LeaderboardRankedSyncService.refreshRankedLeaderboards();
    await ReweightService.markNotified(first.reweight!.reweightId);

    await stubRerate(9.5);
    stubRealmScores(new Map([[TEST_LEADERBOARD_ID, [{ id: TEST_SCORE_ID, pp: 330 }]]]));
    const second = await LeaderboardRankedSyncService.refreshRankedLeaderboards();

    expect(second.reweight?.reweightId).toBe(first.reweight?.reweightId);
    expect(second.reweight?.isNew).toBe(false);
    expect(second.reweight?.alreadyNotified).toBe(true);
    expect(await getReweightRows()).toHaveLength(1);

    // The map was re-rated twice, but the player's pp is compared from before the reweight.
    const [score] = await db.select().from(scoreSaberReweightScoresTable);
    expect(score).toMatchObject({ ppBefore: 250, ppAfter: 330 });
  });

  test("records nothing when no leaderboard was re-rated", async () => {
    const [stored] = await ScoreSaberLeaderboardsRepository.getRankedLeaderboards(DEFAULT_REALM_ID);
    ScoreSaberApiService.getAllLeaderboards = async () => ({
      leaderboards: [stored!],
      leaderboardDifficulties: new Map(),
      complete: true,
    });
    const { calls } = stubRealmScores(new Map());

    const result = await LeaderboardRankedSyncService.refreshRankedLeaderboards();

    expect(result.updates).toHaveLength(0);
    expect(result.reweight).toBeUndefined();
    expect(await getReweightRows()).toHaveLength(0);
    expect(calls).toHaveLength(0);
  });

  test("still stores the star change when capturing pp changes fails", async () => {
    await stubRerate(9);
    stubRealmScores(new Map(), { failingLeaderboardIds: new Set([TEST_LEADERBOARD_ID]) });

    const result = await LeaderboardRankedSyncService.refreshRankedLeaderboards();

    expect(result.reweight?.isNew).toBe(true);
    const [leaderboard] = await ScoreSaberLeaderboardsRepository.getRankedLeaderboards(DEFAULT_REALM_ID);
    expect(leaderboard?.stars).toBe(9);
    const [change] = await db
      .select()
      .from(scoreSaberLeaderboardStarChangeTable)
      .where(eq(scoreSaberLeaderboardStarChangeTable.previousStars, 8.5));
    expect(change?.ppPending).toBe(true);
  });
});

describe("Unranked leaderboards", () => {
  /** ScoreSaber's ranked list containing only a brand new leaderboard, so the seeded one is missing. */
  async function stubRankedListWithoutSeeded(complete: boolean, includeNew = true): Promise<void> {
    const [stored] = await ScoreSaberLeaderboardsRepository.getRankedLeaderboards(DEFAULT_REALM_ID);
    if (!stored) {
      throw new Error("Expected a seeded ranked leaderboard");
    }
    ScoreSaberApiService.getAllLeaderboards = async () => ({
      leaderboards: includeNew ? [{ ...stored, id: 900_099, songHash: "f".repeat(32) }] : [],
      leaderboardDifficulties: new Map(),
      complete,
    });
  }

  async function getRankedIds(): Promise<number[]> {
    return (await ScoreSaberLeaderboardsRepository.getRankedLeaderboards(DEFAULT_REALM_ID)).map(lb => lb.id);
  }

  test("a leaderboard missing from a complete ranked list is unranked and its pp is removed", async () => {
    await stubRankedListWithoutSeeded(true);
    const { calls } = stubRealmScores(new Map());

    const result = await LeaderboardRankedSyncService.refreshRankedLeaderboards();

    expect(await getRankedIds()).not.toContain(TEST_LEADERBOARD_ID);
    expect(
      result.updates.find(update => update.newLeaderboard.id === TEST_LEADERBOARD_ID)?.previousLeaderboard
        ?.ranked
    ).toBe(true);

    // Recorded as going to 0 stars, inside a reweight.
    const [change] = await db
      .select()
      .from(scoreSaberLeaderboardStarChangeTable)
      .where(eq(scoreSaberLeaderboardStarChangeTable.previousStars, 8.5));
    expect(change).toMatchObject({
      leaderboardId: TEST_LEADERBOARD_ID,
      newStars: 0,
      reweightId: result.reweight?.reweightId,
      ppPending: false,
    });

    // Every score lost all of its pp, without asking ScoreSaber about the unranked leaderboard.
    expect(calls).not.toContain(TEST_LEADERBOARD_ID);
    expect(await getRealmPp(TEST_SCORE_ID)).toBeUndefined();
    expect(await getRealmPp(TEST_SCORE_TWO_ID)).toBeUndefined();

    const scores = await db
      .select()
      .from(scoreSaberReweightScoresTable)
      .orderBy(scoreSaberReweightScoresTable.scoreId);
    expect(scores.map(score => [score.scoreId, score.ppBefore, score.ppAfter])).toEqual([
      [TEST_SCORE_ID, 250, 0],
      [TEST_SCORE_TWO_ID, 200, 0],
    ]);

    const players = await db.select().from(scoreSaberReweightPlayersTable);
    expect(players.map(player => player.ppAfter)).toEqual([0, 0]);
    expect(players.find(player => player.playerId === TEST_PLAYER_ID)?.ppDelta).toBeCloseTo(-250, 6);
  });

  test("does not unrank anything when ScoreSaber's list could not be fetched completely", async () => {
    await stubRankedListWithoutSeeded(false);

    const result = await LeaderboardRankedSyncService.refreshRankedLeaderboards();

    expect(await getRankedIds()).toContain(TEST_LEADERBOARD_ID);
    expect(result.updates.some(update => update.newLeaderboard.id === TEST_LEADERBOARD_ID)).toBe(false);
    expect(result.reweight).toBeUndefined();
    expect(await getRealmPp(TEST_SCORE_ID)).toBe(250);
  });

  test("does not unrank anything when ScoreSaber returns an empty list", async () => {
    await stubRankedListWithoutSeeded(true, false);

    await LeaderboardRankedSyncService.refreshRankedLeaderboards();

    expect(await getRankedIds()).toContain(TEST_LEADERBOARD_ID);
    expect(await getRealmPp(TEST_SCORE_ID)).toBe(250);
  });

  test("clears another realm's pp without touching the default realm", async () => {
    await db.insert(scoreSaberScoreRealmsTable).values({
      scoreId: TEST_SCORE_ID,
      realmId: 2,
      playerId: TEST_PLAYER_ID,
      leaderboardId: TEST_LEADERBOARD_ID,
      pp: 50,
    });

    await RealmScoreSyncService.clearLeaderboards([TEST_LEADERBOARD_ID], 2);

    const rows = await db
      .select()
      .from(scoreSaberScoreRealmsTable)
      .where(eq(scoreSaberScoreRealmsTable.scoreId, TEST_SCORE_ID));
    expect(rows.map(row => row.realmId)).toEqual([DEFAULT_REALM_ID]);
  });
});

describe("Reweight API integration", () => {
  const app = createTestApp();

  /** Creates a reweight with captured pp changes for both seeded players. */
  async function seedCapturedReweight(): Promise<number> {
    await seedUnchangedScore();
    const reweightId = await recordSeededStarChange(BASE, 8, 8.5);
    await recordSeededStarChange(new Date(BASE.getTime() + DAY), 8.5, 9);
    await ReweightService.recordStarChanges(DEFAULT_REALM_ID, [
      {
        leaderboardId: TEST_LEADERBOARD_QUALIFIED_ID,
        previousStars: 6,
        newStars: 7,
        timestamp: new Date(BASE.getTime() + 2 * DAY),
      },
    ]);
    stubRealmScores(
      new Map([
        [
          TEST_LEADERBOARD_ID,
          [
            { id: TEST_SCORE_ID, pp: 300 },
            { id: TEST_SCORE_TWO_ID, pp: 150 },
          ],
        ],
        [TEST_LEADERBOARD_QUALIFIED_ID, [{ id: EXTRA_SCORE_ID, pp: 100 }]],
      ])
    );
    await ReweightService.processPendingPpChanges();
    return reweightId;
  }

  describe("GET /reweights", () => {
    test("returns an empty page when there are no reweights", async () => {
      const response = await request(app, "/reweights");
      expectStatus(response, 200);

      const body = (await response.json()) as ReweightsPageResponse;
      expect(body.items).toEqual([]);
      expectPaginationMetadata(body.metadata, 1);
    });

    test("lists reweights newest first with generated names", async () => {
      await ScoreSaberReweightRepository.insert({
        startedAt: new Date("2025-11-03T00:00:00.000Z"),
        endedAt: new Date("2025-11-04T00:00:00.000Z"),
      });
      await ScoreSaberReweightRepository.insert({
        startedAt: new Date("2026-01-10T00:00:00.000Z"),
        endedAt: new Date("2026-01-11T00:00:00.000Z"),
        name: "Spring Special",
      });
      await ScoreSaberReweightRepository.insert({
        startedAt: new Date("2026-01-12T00:00:00.000Z"),
        endedAt: new Date("2026-01-12T00:00:00.000Z"),
      });

      const response = await request(app, "/reweights?page=1");
      expectStatus(response, 200);

      const body = (await response.json()) as ReweightsPageResponse;
      expect(body.items.map(item => item.name)).toEqual([
        "January 2026 Reweight",
        "Spring Special",
        "November 2025 Reweight",
      ]);
    });

    test("paginates", async () => {
      for (let index = 0; index < 13; index++) {
        await ScoreSaberReweightRepository.insert({
          startedAt: new Date(BASE.getTime() + index * 30 * DAY),
          endedAt: new Date(BASE.getTime() + index * 30 * DAY),
        });
      }

      const first = (await (await request(app, "/reweights?page=1")).json()) as ReweightsPageResponse;
      const second = (await (await request(app, "/reweights?page=2")).json()) as ReweightsPageResponse;

      expect(first.items).toHaveLength(12);
      expect(second.items).toHaveLength(1);
      expect(first.metadata.totalPages).toBe(2);
      expect(first.metadata.totalItems).toBe(13);
      expect(new Date(second.items[0]?.startedAt ?? 0)).toEqual(BASE);
    });

    test("returns 404 for a page past the end", async () => {
      await expectNotFound(await request(app, "/reweights?page=5"), "Invalid page number");
    });

    test("rejects an invalid page", async () => {
      await expectValidationError(await request(app, "/reweights?page=0"));
    });
  });

  describe("GET /reweights/markers", () => {
    test("returns the reweights oldest first", async () => {
      await ScoreSaberReweightRepository.insert({
        startedAt: new Date("2026-01-10T00:00:00.000Z"),
        endedAt: new Date("2026-01-10T00:00:00.000Z"),
      });
      await ScoreSaberReweightRepository.insert({
        startedAt: new Date("2025-06-01T00:00:00.000Z"),
        endedAt: new Date("2025-06-01T00:00:00.000Z"),
        name: "Midsummer",
      });

      const response = await request(app, "/reweights/markers");
      expectStatus(response, 200);

      const body = (await response.json()) as ReweightMarkersResponse;
      expect(body.map(marker => marker.name)).toEqual(["Midsummer", "January 2026 Reweight"]);
      expect(new Date(body[0]?.date ?? 0)).toEqual(new Date("2025-06-01T00:00:00.000Z"));
      expect(Object.keys(body[0] ?? {}).sort()).toEqual(["date", "id", "name"]);
    });
  });

  describe("GET /reweights/:reweightId", () => {
    test("returns the reweight with one entry per re-rated leaderboard", async () => {
      const reweightId = await seedCapturedReweight();

      const response = await request(app, `/reweights/${reweightId}`);
      expectStatus(response, 200);

      const body = (await response.json()) as ReweightResponse;
      expect(body.reweight).toMatchObject({
        id: reweightId,
        name: "January 2026 Reweight",
        leaderboardCount: 2,
        playerCount: 2,
        scoreCount: 2, // the unchanged 100 pp score is not recorded
      });
      expect(body.leaderboards).toHaveLength(2);

      // Re-rated twice (8 -> 8.5 -> 9) but shown as a single change.
      const ranked = body.leaderboards.find(leaderboard => leaderboard.leaderboardId === TEST_LEADERBOARD_ID);
      expect(ranked).toMatchObject({
        previousStars: 8,
        newStars: 9,
        songName: "Test Song",
        difficulty: "ExpertPlus",
      });
      // Biggest star gain first (tied here, so by id).
      expect(body.leaderboards[0]?.leaderboardId).toBe(TEST_LEADERBOARD_ID);
    });

    test("returns 404 for an unknown reweight", async () => {
      await expectNotFound(await request(app, "/reweights/999999"), "Reweight");
    });

    test("rejects an invalid id", async () => {
      await expectValidationError(await request(app, "/reweights/0"));
      await expectValidationError(await request(app, "/reweights/abc"));
    });
  });

  describe("GET /reweights/:reweightId/players", () => {
    test("lists only gaining players as gains and only losing players as losses, biggest first", async () => {
      const reweightId = await seedCapturedReweight();

      const gains = (await (
        await request(app, `/reweights/${reweightId}/players`)
      ).json()) as ReweightPlayersPageResponse;
      expect(gains.items.map(item => item.playerId)).toEqual([TEST_PLAYER_ID]);
      expect(gains.items[0]).toMatchObject({ name: "TestPlayer", scoresChanged: 1 });
      expect(gains.items[0]?.ppDelta).toBeCloseTo(50, 6);
      expect(gains.metadata.totalItems).toBe(1);

      const losses = (await (
        await request(app, `/reweights/${reweightId}/players?direction=loss`)
      ).json()) as ReweightPlayersPageResponse;
      expect(losses.items.map(item => item.playerId)).toEqual([TEST_PLAYER_TWO_ID]);
      expect(losses.items[0]?.ppDelta).toBeLessThan(0);
      expectPaginationMetadata(losses.metadata, 1);
    });

    test("never lists a player who did not move in the wrong direction", async () => {
      const reweightId = await seedCapturedReweight();
      await db
        .update(scoreSaberReweightPlayersTable)
        .set({ ppDelta: -5 })
        .where(eq(scoreSaberReweightPlayersTable.playerId, TEST_PLAYER_ID));

      const gains = (await (
        await request(app, `/reweights/${reweightId}/players`)
      ).json()) as ReweightPlayersPageResponse;
      expect(gains.items).toEqual([]);
      expect(gains.metadata.totalItems).toBe(0);
    });

    test("leaves out inactive players", async () => {
      const reweightId = await seedCapturedReweight();
      await db.insert(scoreSaberReweightPlayersTable).values({
        reweightId,
        playerId: TEST_INACTIVE_PLAYER_ID,
        ppBefore: 10,
        ppAfter: 500,
        ppDelta: 490,
        scoresChanged: 1,
      });

      const body = (await (
        await request(app, `/reweights/${reweightId}/players`)
      ).json()) as ReweightPlayersPageResponse;
      expect(body.items.map(item => item.playerId)).not.toContain(TEST_INACTIVE_PLAYER_ID);
      expect(body.metadata.totalItems).toBe(1);
    });

    test("rejects an invalid direction and returns 404 for an unknown reweight", async () => {
      const reweightId = await seedCapturedReweight();

      await expectValidationError(await request(app, `/reweights/${reweightId}/players?direction=sideways`));
      await expectNotFound(await request(app, "/reweights/999999/players"), "Reweight");
    });
  });

  describe("ppPending", () => {
    test("is true while a reweight's pp changes are not captured and false afterwards", async () => {
      await seedUnchangedScore();
      await ReweightService.recordStarChanges(DEFAULT_REALM_ID, [
        { leaderboardId: TEST_LEADERBOARD_ID, previousStars: 8, newStars: 9, timestamp: BASE },
      ]);
      const [row] = await getReweightRows();
      const reweightId = row?.id as number;

      const pending = (await (await request(app, `/reweights/${reweightId}`)).json()) as ReweightResponse;
      expect(pending.reweight.ppPending).toBe(true);

      stubRealmScores(new Map([[TEST_LEADERBOARD_ID, [{ id: TEST_SCORE_ID, pp: 300 }]]]));
      await ReweightService.processPendingPpChanges();

      const done = (await (await request(app, `/reweights/${reweightId}`)).json()) as ReweightResponse;
      expect(done.reweight.ppPending).toBe(false);

      const list = (await (await request(app, "/reweights")).json()) as ReweightsPageResponse;
      expect(list.items[0]?.ppPending).toBe(false);
    });
  });

  describe("GET /leaderboard/by-id/:leaderboardId/star-history", () => {
    test("includes the reweight a star change belongs to", async () => {
      const reweightId = await recordSeededStarChange(BASE, 8, 8.5);

      const response = await request(app, `/leaderboard/by-id/${TEST_LEADERBOARD_ID}/star-history`);
      expectStatus(response, 200);

      const body = (await response.json()) as Array<{ newStars: number; reweightId?: number }>;
      expect(body.find(change => change.newStars === 8.5)?.reweightId).toBe(reweightId);
    });
  });

  describe("GET /reweights/player/:playerId", () => {
    test("returns the reweights that changed the player's pp", async () => {
      const reweightId = await seedCapturedReweight();

      const response = await request(app, `/reweights/player/${TEST_PLAYER_ID}`);
      expectStatus(response, 200);

      const body = (await response.json()) as PlayerReweightsResponse;
      expect(body).toHaveLength(1);
      expect(body[0]?.reweight.id).toBe(reweightId);
      expect(body[0]?.ppDelta).toBeCloseTo(50, 6);
      expect(body[0]?.scoresChanged).toBe(1);
    });

    test("returns nothing for a player no reweight changed", async () => {
      await seedCapturedReweight();

      const body = (await (
        await request(app, `/reweights/player/${UNKNOWN_PLAYER_ID}`)
      ).json()) as PlayerReweightsResponse;
      expect(body).toEqual([]);
    });
  });

  describe("GET /reweights/player/:playerId/:reweightId/scores", () => {
    test("returns the changed scores of the player with their leaderboards", async () => {
      const reweightId = await seedCapturedReweight();

      const response = await request(app, `/reweights/player/${TEST_PLAYER_ID}/${reweightId}/scores`);
      expectStatus(response, 200);

      const body = (await response.json()) as PlayerReweightScoresResponse;
      expect(body).toHaveLength(1);
      expect(body[0]).toMatchObject({
        scoreId: TEST_SCORE_ID,
        leaderboardId: TEST_LEADERBOARD_ID,
        songName: "Test Song",
        ppBefore: 250,
        ppAfter: 300,
        ppDelta: 50,
      });
    });

    test("returns every changed score, the biggest pp gain first", async () => {
      const reweightId = await seedCapturedReweight();
      await db.insert(scoreSaberReweightScoresTable).values([
        {
          reweightId,
          scoreId: 9001,
          playerId: TEST_PLAYER_ID,
          leaderboardId: TEST_LEADERBOARD_ID,
          ppBefore: 200,
          ppAfter: 150,
        },
        {
          reweightId,
          scoreId: 9002,
          playerId: TEST_PLAYER_ID,
          leaderboardId: TEST_LEADERBOARD_ID,
          ppBefore: 100,
          ppAfter: 180,
        },
      ]);

      const body = (await (
        await request(app, `/reweights/player/${TEST_PLAYER_ID}/${reweightId}/scores`)
      ).json()) as PlayerReweightScoresResponse;

      // +80, +50 (the seeded score), -50: gains first, the biggest loss last.
      expect(body.map(score => score.scoreId)).toEqual([9002, TEST_SCORE_ID, 9001]);
    });

    test("returns 404 when the player has no changed scores in the reweight", async () => {
      const reweightId = await seedCapturedReweight();

      await expectNotFound(
        await request(app, `/reweights/player/${UNKNOWN_PLAYER_ID}/${reweightId}/scores`),
        "No score changes"
      );
    });
  });
});

describe("buildRankedBatchMessage", () => {
  const pasteUrl = "https://paste.example/abc";

  test("pings the role and links the new reweight", () => {
    const message = buildRankedBatchMessage(pasteUrl, false, {
      reweightId: 7,
      isNew: true,
      alreadyNotified: false,
    });

    expect(message).toContain("<@&1338261690952978442>");
    expect(message).toContain(`New Ranked Batch: ${pasteUrl}`);
    expect(message).toContain(`${env.NEXT_PUBLIC_WEBSITE_URL}/reweights/7`);
  });

  test("does not ping again for star changes merged into an announced reweight, but still links it", () => {
    const message = buildRankedBatchMessage(pasteUrl, false, {
      reweightId: 7,
      isNew: false,
      alreadyNotified: true,
    });

    expect(message).not.toContain("<@&");
    expect(message).toContain(pasteUrl);
    expect(message).toContain(`${env.NEXT_PUBLIC_WEBSITE_URL}/reweights/7`);
  });

  test("still pings when a merged batch also ranked new maps", () => {
    const message = buildRankedBatchMessage(pasteUrl, true, {
      reweightId: 7,
      isNew: false,
      alreadyNotified: true,
    });

    expect(message).toContain("<@&1338261690952978442>");
    expect(message).toContain(`${env.NEXT_PUBLIC_WEBSITE_URL}/reweights/7`);
  });

  test("pings without a link when the batch has no reweight", () => {
    const message = buildRankedBatchMessage(pasteUrl, true, undefined);

    expect(message).toBe(`<@&1338261690952978442> New Ranked Batch: ${pasteUrl}`);
  });
});

beforeEach(() => {
  stubRealmScores(new Map());
});
