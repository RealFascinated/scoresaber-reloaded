import { env } from "@ssr/common/env";
import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import type {
  PlayerRankedBatchScoresResponse,
  PlayerRankedBatchesResponse,
  RankedBatchMarkersResponse,
  RankedBatchPlayersPageResponse,
  RankedBatchResponse,
  RankedBatchesPageResponse,
} from "@ssr/common/schemas/ranked-batch/ranked-batch-responses";
import { beforeEach, describe, expect, test } from "bun:test";
import { and, eq } from "drizzle-orm";
import { HttpResponse } from "msw";
import { db } from "../../src/db";
import {
  scoreSaberLeaderboardStarChangeTable,
  scoreSaberRankedBatchPlayersTable,
  scoreSaberRankedBatchScoresTable,
  scoreSaberRankedBatchesTable,
  scoreSaberScoreRealmsTable,
  scoreSaberScoresTable,
} from "../../src/db/schema";
import { ScoreSaberLeaderboardsRepository } from "../../src/repositories/scoresaber-leaderboards.repository";
import { ScoreSaberRankedBatchRepository } from "../../src/repositories/scoresaber-ranked-batch.repository";
import { buildRankedBatchMessage } from "../../src/service/leaderboard/leaderboard-ranked-batch-notifications.service";
import { LeaderboardRankedSyncService } from "../../src/service/leaderboard/leaderboard-ranked-sync.service";
import { RankedBatchService } from "../../src/service/ranked-batch/ranked-batch.service";
import { RealmScoreSyncService } from "../../src/service/realm/realm-score-sync.service";
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
import { server } from "../helpers/msw-server";
import { request } from "../helpers/request";
import { scoreSaberApi, scoreSaberRankedLeaderboards } from "../helpers/scoresaber-api.test-utils";

const DAY = 24 * 60 * 60 * 1000;
const BASE = new Date("2026-01-10T00:00:00.000Z");
const EXTRA_SCORE_ID = 900_010;
const UNSTORED_SCORE_ID = 999_001;

type StubbedScores = Map<number, { id: number; pp: number }[]>;

function stubRealmScores(
  scores: StubbedScores,
  options: { pageSize?: number; failingLeaderboardIds?: Set<number> } = {}
) {
  const { pageSize = 100, failingLeaderboardIds = new Set<number>() } = options;
  const calls: number[] = [];

  server.use(
    scoreSaberApi("/v2/leaderboards/:id/scores", ({ params, searchParams }) => {
      const leaderboardId = Number(params.id);
      const page = Number(searchParams.get("page") ?? "1");
      calls.push(leaderboardId);
      if (failingLeaderboardIds.has(leaderboardId)) {
        return new HttpResponse(null, { status: 404 });
      }

      const all = scores.get(leaderboardId) ?? [];
      return HttpResponse.json({
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
      });
    })
  );
  return { calls };
}

async function seedUnchangedScore() {
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

async function getRealmPp(scoreId: number) {
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

async function getRankedBatchRows() {
  return db.select().from(scoreSaberRankedBatchesTable).orderBy(scoreSaberRankedBatchesTable.id);
}

async function recordSeededStarChange(timestamp: Date = BASE, previousStars = 8.5, newStars = 9) {
  const recorded = await RankedBatchService.recordStarChanges(DEFAULT_REALM_ID, [
    { leaderboardId: TEST_LEADERBOARD_ID, previousStars, newStars, timestamp },
  ]);
  if (!recorded) {
    throw new Error("Expected the star change to be recorded in a ranked batch");
  }
  return recorded.rankedBatchId;
}

describe("RankedBatchService.recordStarChanges", () => {
  test("starts a ranked batch for the first star changes", async () => {
    const recorded = await RankedBatchService.recordStarChanges(DEFAULT_REALM_ID, [
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

    const [rankedBatch] = await getRankedBatchRows();
    expect(recorded).toBeDefined();
    expect(rankedBatch?.id).toBe(recorded?.rankedBatchId as number);
    expect(rankedBatch?.startedAt).toEqual(BASE);
    expect(rankedBatch?.endedAt).toEqual(new Date(BASE.getTime() + 1000));
    expect(rankedBatch?.leaderboardCount).toBe(2);
    expect(rankedBatch?.notifiedAt).toBeNull();

    const changes = await db
      .select()
      .from(scoreSaberLeaderboardStarChangeTable)
      .where(eq(scoreSaberLeaderboardStarChangeTable.rankedBatchId, rankedBatch!.id));
    expect(changes).toHaveLength(2);
    expect(changes.every(change => change.ppPending)).toBe(true);
  });

  test("records newly ranked leaderboards apart from the star changes", async () => {
    const recorded = await RankedBatchService.recordStarChanges(
      DEFAULT_REALM_ID,
      [{ leaderboardId: TEST_LEADERBOARD_ID, previousStars: 8.5, newStars: 9, timestamp: BASE }],
      [{ leaderboardId: TEST_LEADERBOARD_QUALIFIED_ID, stars: 6, timestamp: BASE }]
    );

    const [rankedBatch] = await getRankedBatchRows();
    expect(rankedBatch?.id).toBe(recorded?.rankedBatchId as number);
    expect(rankedBatch?.leaderboardCount).toBe(1);
    expect(rankedBatch?.newLeaderboardCount).toBe(1);

    const changes = await db
      .select()
      .from(scoreSaberLeaderboardStarChangeTable)
      .where(eq(scoreSaberLeaderboardStarChangeTable.rankedBatchId, rankedBatch!.id));
    expect(changes.map(change => change.leaderboardId)).toEqual([TEST_LEADERBOARD_ID]);
  });

  test("starts a ranked batch for newly ranked leaderboards alone and ignores repeats", async () => {
    const newlyRanked = [{ leaderboardId: TEST_LEADERBOARD_QUALIFIED_ID, stars: 6, timestamp: BASE }];
    const first = await RankedBatchService.recordStarChanges(DEFAULT_REALM_ID, [], newlyRanked);
    const second = await RankedBatchService.recordStarChanges(DEFAULT_REALM_ID, [], newlyRanked);

    expect(first?.isNew).toBe(true);
    expect(second?.rankedBatchId).toBe(first?.rankedBatchId as number);
    const [rankedBatch] = await getRankedBatchRows();
    expect(rankedBatch?.leaderboardCount).toBe(0);
    expect(rankedBatch?.newLeaderboardCount).toBe(1);
  });

  test("merges star changes made within the merge window into the same ranked batch", async () => {
    const first = await recordSeededStarChange(BASE);
    const second = await RankedBatchService.recordStarChanges(DEFAULT_REALM_ID, [
      {
        leaderboardId: TEST_LEADERBOARD_QUALIFIED_ID,
        previousStars: 6,
        newStars: 7,
        timestamp: new Date(BASE.getTime() + 2 * DAY),
      },
    ]);

    expect(second?.isNew).toBe(false);
    expect(second?.rankedBatchId).toBe(first);

    const rankedBatches = await getRankedBatchRows();
    expect(rankedBatches).toHaveLength(1);
    expect(rankedBatches[0]?.startedAt).toEqual(BASE);
    expect(rankedBatches[0]?.endedAt).toEqual(new Date(BASE.getTime() + 2 * DAY));
    expect(rankedBatches[0]?.leaderboardCount).toBe(2);
  });

  test("keeps merging while changes keep arriving inside the window", async () => {
    const first = await recordSeededStarChange(BASE);
    await recordSeededStarChange(new Date(BASE.getTime() + 2.5 * DAY), 9, 9.5);
    const third = await recordSeededStarChange(new Date(BASE.getTime() + 5 * DAY), 9.5, 10);

    expect(third).toBe(first);
    expect(await getRankedBatchRows()).toHaveLength(1);
  });

  test("starts a new ranked batch once the window has passed", async () => {
    const first = await recordSeededStarChange(BASE);
    const later = await RankedBatchService.recordStarChanges(DEFAULT_REALM_ID, [
      {
        leaderboardId: TEST_LEADERBOARD_ID,
        previousStars: 9,
        newStars: 9.5,
        timestamp: new Date(BASE.getTime() + 3 * DAY + 1000),
      },
    ]);

    expect(later?.isNew).toBe(true);
    expect(later?.rankedBatchId).not.toBe(first);
    expect(await getRankedBatchRows()).toHaveLength(2);
  });

  test("counts a map that was re-rated twice once", async () => {
    await recordSeededStarChange(BASE, 8, 8.5);
    await recordSeededStarChange(new Date(BASE.getTime() + DAY), 8.5, 9);

    const [rankedBatch] = await getRankedBatchRows();
    expect(rankedBatch?.leaderboardCount).toBe(1);
  });

  test("reports a merge into an announced ranked batch so it is not announced again", async () => {
    const rankedBatchId = await recordSeededStarChange(BASE);
    await RankedBatchService.markNotified(rankedBatchId);

    const merged = await RankedBatchService.recordStarChanges(DEFAULT_REALM_ID, [
      {
        leaderboardId: TEST_LEADERBOARD_QUALIFIED_ID,
        previousStars: 6,
        newStars: 7,
        timestamp: new Date(BASE.getTime() + DAY),
      },
    ]);

    expect(merged?.rankedBatchId).toBe(rankedBatchId);
    expect(merged?.alreadyNotified).toBe(true);
  });

  test("does not create ranked batches for other realms", async () => {
    const recorded = await RankedBatchService.recordStarChanges(2, [
      { leaderboardId: TEST_LEADERBOARD_ID, previousStars: 8, newStars: 9, timestamp: BASE },
    ]);

    expect(recorded).toBeUndefined();
    expect(await getRankedBatchRows()).toHaveLength(0);

    const [change] = await db
      .select()
      .from(scoreSaberLeaderboardStarChangeTable)
      .where(eq(scoreSaberLeaderboardStarChangeTable.realmId, 2));
    expect(change?.rankedBatchId).toBeNull();
    expect(change?.ppPending).toBe(false);
  });

  test("records nothing for no star changes", async () => {
    expect(await RankedBatchService.recordStarChanges(DEFAULT_REALM_ID, [])).toBeUndefined();
    expect(await getRankedBatchRows()).toHaveLength(0);
  });
});

describe("RankedBatchService.processPendingPpChanges", () => {
  test("captures the pp change of every changed score and player", async () => {
    await seedUnchangedScore();
    const rankedBatchId = await recordSeededStarChange();
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

    await RankedBatchService.processPendingPpChanges();

    const scores = await db
      .select()
      .from(scoreSaberRankedBatchScoresTable)
      .where(eq(scoreSaberRankedBatchScoresTable.rankedBatchId, rankedBatchId))
      .orderBy(scoreSaberRankedBatchScoresTable.scoreId);
    expect(scores).toHaveLength(2);
    expect(scores[0]).toMatchObject({
      scoreId: TEST_SCORE_ID,
      playerId: TEST_PLAYER_ID,
      leaderboardId: TEST_LEADERBOARD_ID,
      ppBefore: 250,
      ppAfter: 300,
    });
    expect(scores[1]).toMatchObject({ scoreId: TEST_SCORE_TWO_ID, ppBefore: 200, ppAfter: 150 });

    expect(await getRealmPp(TEST_SCORE_ID)).toBe(300);
    expect(await getRealmPp(TEST_SCORE_TWO_ID)).toBe(150);

    const players = await db
      .select()
      .from(scoreSaberRankedBatchPlayersTable)
      .where(eq(scoreSaberRankedBatchPlayersTable.rankedBatchId, rankedBatchId));
    const playerOne = players.find(player => player.playerId === TEST_PLAYER_ID);
    const playerTwo = players.find(player => player.playerId === TEST_PLAYER_TWO_ID);

    expect(playerOne?.ppBefore).toBeCloseTo(250 + 0.965 * 100, 6);
    expect(playerOne?.ppAfter).toBeCloseTo(300 + 0.965 * 100, 6);
    expect(playerOne?.ppDelta).toBeCloseTo(50, 6);
    expect(playerOne?.scoresChanged).toBe(1);
    expect(playerTwo?.ppDelta).toBeCloseTo(-50, 6);

    const [rankedBatch] = await getRankedBatchRows();
    expect(rankedBatch?.playerCount).toBe(2);
    expect(rankedBatch?.scoreCount).toBe(2);

    const pending = await db
      .select()
      .from(scoreSaberLeaderboardStarChangeTable)
      .where(eq(scoreSaberLeaderboardStarChangeTable.ppPending, true));
    expect(pending).toHaveLength(0);
  });

  test("ranks a lowered score below the player's other scores", async () => {
    await seedUnchangedScore();
    const rankedBatchId = await recordSeededStarChange();
    stubRealmScores(new Map([[TEST_LEADERBOARD_ID, [{ id: TEST_SCORE_ID, pp: 80 }]]]));

    await RankedBatchService.processPendingPpChanges();

    const [player] = await db
      .select()
      .from(scoreSaberRankedBatchPlayersTable)
      .where(
        and(
          eq(scoreSaberRankedBatchPlayersTable.rankedBatchId, rankedBatchId),
          eq(scoreSaberRankedBatchPlayersTable.playerId, TEST_PLAYER_ID)
        )
      );
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

    await RankedBatchService.processPendingPpChanges();

    expect(await db.select().from(scoreSaberRankedBatchScoresTable)).toHaveLength(0);
    expect(await db.select().from(scoreSaberRankedBatchPlayersTable)).toHaveLength(0);
    const [rankedBatch] = await getRankedBatchRows();
    expect(rankedBatch?.scoreCount).toBe(0);
    expect(rankedBatch?.playerCount).toBe(0);
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

    await RankedBatchService.processPendingPpChanges();

    const scores = await db.select().from(scoreSaberRankedBatchScoresTable);
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

    await RankedBatchService.processPendingPpChanges();

    expect(calls).toEqual([TEST_LEADERBOARD_ID, TEST_LEADERBOARD_ID]);
    expect(await db.select().from(scoreSaberRankedBatchScoresTable)).toHaveLength(2);
  });

  test("stores a score that stopped being worth pp and removes its pp row", async () => {
    const rankedBatchId = await recordSeededStarChange();
    stubRealmScores(new Map([[TEST_LEADERBOARD_ID, [{ id: TEST_SCORE_ID, pp: 0 }]]]));

    await RankedBatchService.processPendingPpChanges();

    const [score] = await db
      .select()
      .from(scoreSaberRankedBatchScoresTable)
      .where(eq(scoreSaberRankedBatchScoresTable.rankedBatchId, rankedBatchId));
    expect(score).toMatchObject({ ppBefore: 250, ppAfter: 0 });
    expect(await getRealmPp(TEST_SCORE_ID)).toBeUndefined();

    const [player] = await db
      .select()
      .from(scoreSaberRankedBatchPlayersTable)
      .where(eq(scoreSaberRankedBatchPlayersTable.playerId, TEST_PLAYER_ID));
    expect(player?.ppBefore).toBeCloseTo(250, 6);
    expect(player?.ppAfter).toBe(0);
  });

  test("leaves a leaderboard pending when ScoreSaber cannot be reached and retries it", async () => {
    await recordSeededStarChange();
    stubRealmScores(new Map(), { failingLeaderboardIds: new Set([TEST_LEADERBOARD_ID]) });

    await RankedBatchService.processPendingPpChanges();

    expect(await db.select().from(scoreSaberRankedBatchScoresTable)).toHaveLength(0);
    expect(await getRealmPp(TEST_SCORE_ID)).toBe(250);
    const [pending] = await db
      .select()
      .from(scoreSaberLeaderboardStarChangeTable)
      .where(eq(scoreSaberLeaderboardStarChangeTable.ppPending, true));
    expect(pending?.leaderboardId).toBe(TEST_LEADERBOARD_ID);

    stubRealmScores(new Map([[TEST_LEADERBOARD_ID, [{ id: TEST_SCORE_ID, pp: 300 }]]]));
    await RankedBatchService.processPendingPpChanges();

    const [score] = await db.select().from(scoreSaberRankedBatchScoresTable);
    expect(score).toMatchObject({ scoreId: TEST_SCORE_ID, ppBefore: 250, ppAfter: 300 });
    expect(
      await db
        .select()
        .from(scoreSaberLeaderboardStarChangeTable)
        .where(eq(scoreSaberLeaderboardStarChangeTable.ppPending, true))
    ).toHaveLength(0);
  });

  test("keeps the original pp before when a capture is repeated after the stored pp was overwritten", async () => {
    const rankedBatchId = await recordSeededStarChange();
    await db.insert(scoreSaberRankedBatchScoresTable).values({
      rankedBatchId,
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

    await RankedBatchService.processPendingPpChanges();

    const [score] = await db.select().from(scoreSaberRankedBatchScoresTable);
    expect(score).toMatchObject({ ppBefore: 250, ppAfter: 300 });
  });

  test("does nothing when no star change is pending", async () => {
    const { calls } = stubRealmScores(new Map());

    await RankedBatchService.processPendingPpChanges();

    expect(calls).toHaveLength(0);
  });

  test("does not touch star changes that are not pending, such as seeded ones", async () => {
    const rankedBatchId = await recordSeededStarChange();
    await db
      .update(scoreSaberLeaderboardStarChangeTable)
      .set({ ppPending: false })
      .where(eq(scoreSaberLeaderboardStarChangeTable.rankedBatchId, rankedBatchId));
    const { calls } = stubRealmScores(new Map([[TEST_LEADERBOARD_ID, [{ id: TEST_SCORE_ID, pp: 999 }]]]));

    await RankedBatchService.processPendingPpChanges();

    expect(calls).toHaveLength(0);
    expect(await getRealmPp(TEST_SCORE_ID)).toBe(250);
  });

  test("adds the pp changes of a leaderboard merged in later without losing the earlier ones", async () => {
    await seedUnchangedScore();
    const rankedBatchId = await recordSeededStarChange(BASE);
    stubRealmScores(new Map([[TEST_LEADERBOARD_ID, [{ id: TEST_SCORE_ID, pp: 300 }]]]));
    await RankedBatchService.processPendingPpChanges();

    await RankedBatchService.recordStarChanges(DEFAULT_REALM_ID, [
      {
        leaderboardId: TEST_LEADERBOARD_QUALIFIED_ID,
        previousStars: 6,
        newStars: 7,
        timestamp: new Date(BASE.getTime() + DAY),
      },
    ]);
    stubRealmScores(new Map([[TEST_LEADERBOARD_QUALIFIED_ID, [{ id: EXTRA_SCORE_ID, pp: 140 }]]]));
    await RankedBatchService.processPendingPpChanges();

    const scores = await db
      .select()
      .from(scoreSaberRankedBatchScoresTable)
      .where(eq(scoreSaberRankedBatchScoresTable.rankedBatchId, rankedBatchId));
    expect(scores.map(score => score.scoreId).sort()).toEqual([TEST_SCORE_ID, EXTRA_SCORE_ID].sort());

    const [player] = await db
      .select()
      .from(scoreSaberRankedBatchPlayersTable)
      .where(
        and(
          eq(scoreSaberRankedBatchPlayersTable.rankedBatchId, rankedBatchId),
          eq(scoreSaberRankedBatchPlayersTable.playerId, TEST_PLAYER_ID)
        )
      );
    expect(player?.ppBefore).toBeCloseTo(250 + 0.965 * 100, 6);
    expect(player?.ppAfter).toBeCloseTo(300 + 0.965 * 140, 6);
    expect(player?.scoresChanged).toBe(2);
  });
});

describe("LeaderboardRankedSyncService.refreshRankedLeaderboards", () => {
  async function stubRerate(stars: number) {
    const [stored] = await ScoreSaberLeaderboardsRepository.getRankedLeaderboards(DEFAULT_REALM_ID);
    if (!stored) {
      throw new Error("Expected a seeded ranked leaderboard");
    }
    server.use(scoreSaberRankedLeaderboards([{ ...stored, stars }]));
  }

  test("records a re-rated leaderboard as a ranked batch and captures its pp changes", async () => {
    await stubRerate(9);
    stubRealmScores(new Map([[TEST_LEADERBOARD_ID, [{ id: TEST_SCORE_ID, pp: 310 }]]]));

    const result = await LeaderboardRankedSyncService.refreshRankedLeaderboards();

    expect(result.updates).toHaveLength(1);
    expect(result.rankedBatch?.isNew).toBe(true);
    expect(result.rankedBatch?.alreadyNotified).toBe(false);

    const [change] = await db
      .select()
      .from(scoreSaberLeaderboardStarChangeTable)
      .where(eq(scoreSaberLeaderboardStarChangeTable.previousStars, 8.5));
    expect(change).toMatchObject({
      leaderboardId: TEST_LEADERBOARD_ID,
      newStars: 9,
      rankedBatchId: result.rankedBatch?.rankedBatchId,
      ppPending: false,
    });

    const [leaderboard] = await ScoreSaberLeaderboardsRepository.getRankedLeaderboards(DEFAULT_REALM_ID);
    expect(leaderboard?.stars).toBe(9);

    const [score] = await db.select().from(scoreSaberRankedBatchScoresTable);
    expect(score).toMatchObject({ ppBefore: 250, ppAfter: 310 });
    expect(await getRealmPp(TEST_SCORE_ID)).toBe(310);
  });

  test("merges a second sync inside the window into the same ranked batch", async () => {
    await stubRerate(9);
    stubRealmScores(new Map([[TEST_LEADERBOARD_ID, [{ id: TEST_SCORE_ID, pp: 310 }]]]));
    const first = await LeaderboardRankedSyncService.refreshRankedLeaderboards();
    await RankedBatchService.markNotified(first.rankedBatch!.rankedBatchId);

    await stubRerate(9.5);
    stubRealmScores(new Map([[TEST_LEADERBOARD_ID, [{ id: TEST_SCORE_ID, pp: 330 }]]]));
    const second = await LeaderboardRankedSyncService.refreshRankedLeaderboards();

    expect(second.rankedBatch?.rankedBatchId).toBe(first.rankedBatch?.rankedBatchId);
    expect(second.rankedBatch?.isNew).toBe(false);
    expect(second.rankedBatch?.alreadyNotified).toBe(true);
    expect(await getRankedBatchRows()).toHaveLength(1);

    const [score] = await db.select().from(scoreSaberRankedBatchScoresTable);
    expect(score).toMatchObject({ ppBefore: 250, ppAfter: 330 });
  });

  test("records nothing when no leaderboard was re-rated", async () => {
    const [stored] = await ScoreSaberLeaderboardsRepository.getRankedLeaderboards(DEFAULT_REALM_ID);
    server.use(scoreSaberRankedLeaderboards([stored!]));
    const { calls } = stubRealmScores(new Map());

    const result = await LeaderboardRankedSyncService.refreshRankedLeaderboards();

    expect(result.updates).toHaveLength(0);
    expect(result.rankedBatch).toBeUndefined();
    expect(await getRankedBatchRows()).toHaveLength(0);
    expect(calls).toHaveLength(0);
  });

  test("still stores the star change when capturing pp changes fails", async () => {
    await stubRerate(9);
    stubRealmScores(new Map(), { failingLeaderboardIds: new Set([TEST_LEADERBOARD_ID]) });

    const result = await LeaderboardRankedSyncService.refreshRankedLeaderboards();

    expect(result.rankedBatch?.isNew).toBe(true);
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
  async function stubRankedListWithoutSeeded(complete: boolean, includeNew = true) {
    const [stored] = await ScoreSaberLeaderboardsRepository.getRankedLeaderboards(DEFAULT_REALM_ID);
    if (!stored) {
      throw new Error("Expected a seeded ranked leaderboard");
    }
    server.use(
      scoreSaberRankedLeaderboards(includeNew ? [{ ...stored, id: 900_099, songHash: "f".repeat(32) }] : [], {
        complete,
      })
    );
  }

  async function getRankedIds() {
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

    const [change] = await db
      .select()
      .from(scoreSaberLeaderboardStarChangeTable)
      .where(eq(scoreSaberLeaderboardStarChangeTable.previousStars, 8.5));
    expect(change).toMatchObject({
      leaderboardId: TEST_LEADERBOARD_ID,
      newStars: 0,
      rankedBatchId: result.rankedBatch?.rankedBatchId,
      ppPending: false,
    });

    expect(calls).not.toContain(TEST_LEADERBOARD_ID);
    expect(await getRealmPp(TEST_SCORE_ID)).toBeUndefined();
    expect(await getRealmPp(TEST_SCORE_TWO_ID)).toBeUndefined();

    const scores = await db
      .select()
      .from(scoreSaberRankedBatchScoresTable)
      .orderBy(scoreSaberRankedBatchScoresTable.scoreId);
    expect(scores.map(score => [score.scoreId, score.ppBefore, score.ppAfter])).toEqual([
      [TEST_SCORE_ID, 250, 0],
      [TEST_SCORE_TWO_ID, 200, 0],
    ]);

    const players = await db.select().from(scoreSaberRankedBatchPlayersTable);
    expect(players.map(player => player.ppAfter)).toEqual([0, 0]);
    expect(players.find(player => player.playerId === TEST_PLAYER_ID)?.ppDelta).toBeCloseTo(-250, 6);
  });

  test("does not unrank anything when ScoreSaber's list could not be fetched completely", async () => {
    await stubRankedListWithoutSeeded(false);

    const result = await LeaderboardRankedSyncService.refreshRankedLeaderboards();

    expect(await getRankedIds()).toContain(TEST_LEADERBOARD_ID);
    expect(result.updates.some(update => update.newLeaderboard.id === TEST_LEADERBOARD_ID)).toBe(false);
    expect(result.rankedBatch).toBeUndefined();
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

describe("Ranked Batch API integration", () => {
  const app = createTestApp();

  async function seedCapturedRankedBatch() {
    await seedUnchangedScore();
    const rankedBatchId = await recordSeededStarChange(BASE, 8, 8.5);
    await recordSeededStarChange(new Date(BASE.getTime() + DAY), 8.5, 9);
    await RankedBatchService.recordStarChanges(DEFAULT_REALM_ID, [
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
    await RankedBatchService.processPendingPpChanges();
    return rankedBatchId;
  }

  describe("GET /ranked-batches", () => {
    test("returns an empty page when there are no ranked batches", async () => {
      const response = await request(app, "/ranked-batches");
      expectStatus(response, 200);

      const body = (await response.json()) as RankedBatchesPageResponse;
      expect(body.items).toEqual([]);
      expectPaginationMetadata(body.metadata, 1);
    });

    test("lists ranked batches newest first with generated names", async () => {
      await ScoreSaberRankedBatchRepository.insert({
        startedAt: new Date("2025-11-03T00:00:00.000Z"),
        endedAt: new Date("2025-11-04T00:00:00.000Z"),
      });
      await ScoreSaberRankedBatchRepository.insert({
        startedAt: new Date("2026-01-10T00:00:00.000Z"),
        endedAt: new Date("2026-01-11T00:00:00.000Z"),
        name: "Spring Special",
      });
      await ScoreSaberRankedBatchRepository.insert({
        startedAt: new Date("2026-01-12T00:00:00.000Z"),
        endedAt: new Date("2026-01-12T00:00:00.000Z"),
      });

      const response = await request(app, "/ranked-batches?page=1");
      expectStatus(response, 200);

      const body = (await response.json()) as RankedBatchesPageResponse;
      expect(body.items.map(item => item.name)).toEqual([
        "January 2026 Ranked Batch",
        "Spring Special",
        "November 2025 Ranked Batch",
      ]);
    });

    test("paginates", async () => {
      for (let index = 0; index < 13; index++) {
        await ScoreSaberRankedBatchRepository.insert({
          startedAt: new Date(BASE.getTime() + index * 30 * DAY),
          endedAt: new Date(BASE.getTime() + index * 30 * DAY),
        });
      }

      const first = (await (
        await request(app, "/ranked-batches?page=1")
      ).json()) as RankedBatchesPageResponse;
      const second = (await (
        await request(app, "/ranked-batches?page=2")
      ).json()) as RankedBatchesPageResponse;

      expect(first.items).toHaveLength(12);
      expect(second.items).toHaveLength(1);
      expect(first.metadata.totalPages).toBe(2);
      expect(first.metadata.totalItems).toBe(13);
      expect(new Date(second.items[0]?.startedAt ?? 0)).toEqual(BASE);
    });

    test("returns 404 for a page past the end", async () => {
      await expectNotFound(await request(app, "/ranked-batches?page=5"), "Invalid page number");
    });

    test("rejects an invalid page", async () => {
      await expectValidationError(await request(app, "/ranked-batches?page=0"));
    });
  });

  describe("GET /ranked-batches/markers", () => {
    test("returns the ranked batches oldest first", async () => {
      await ScoreSaberRankedBatchRepository.insert({
        startedAt: new Date("2026-01-10T00:00:00.000Z"),
        endedAt: new Date("2026-01-10T00:00:00.000Z"),
      });
      await ScoreSaberRankedBatchRepository.insert({
        startedAt: new Date("2025-06-01T00:00:00.000Z"),
        endedAt: new Date("2025-06-01T00:00:00.000Z"),
        name: "Midsummer",
      });

      const response = await request(app, "/ranked-batches/markers");
      expectStatus(response, 200);

      const body = (await response.json()) as RankedBatchMarkersResponse;
      expect(body.map(marker => marker.name)).toEqual(["Midsummer", "January 2026 Ranked Batch"]);
      expect(new Date(body[0]?.date ?? 0)).toEqual(new Date("2025-06-01T00:00:00.000Z"));
      expect(Object.keys(body[0] ?? {}).sort()).toEqual(["date", "id", "name"]);
    });
  });

  describe("GET /ranked-batches/:rankedBatchId", () => {
    test("returns the ranked batch with one entry per re-rated leaderboard", async () => {
      const rankedBatchId = await seedCapturedRankedBatch();

      const response = await request(app, `/ranked-batches/${rankedBatchId}`);
      expectStatus(response, 200);

      const body = (await response.json()) as RankedBatchResponse;
      expect(body.rankedBatch).toMatchObject({
        id: rankedBatchId,
        name: "January 2026 Ranked Batch",
        leaderboardCount: 2,
        playerCount: 2,
        scoreCount: 2,
      });
      expect(body.leaderboards).toHaveLength(2);
      expect(body.rankedBatch.newLeaderboardCount).toBe(0);
      expect(body.newLeaderboards).toEqual([]);

      const ranked = body.leaderboards.find(leaderboard => leaderboard.leaderboardId === TEST_LEADERBOARD_ID);
      expect(ranked).toMatchObject({
        previousStars: 8,
        newStars: 9,
        songName: "Test Song",
        difficulty: "ExpertPlus",
      });
      expect(body.leaderboards[0]?.leaderboardId).toBe(TEST_LEADERBOARD_ID);
    });

    test("returns the newly ranked leaderboards apart from the re-rated ones", async () => {
      const recorded = await RankedBatchService.recordStarChanges(
        DEFAULT_REALM_ID,
        [{ leaderboardId: TEST_LEADERBOARD_ID, previousStars: 8.5, newStars: 9, timestamp: BASE }],
        [{ leaderboardId: TEST_LEADERBOARD_QUALIFIED_ID, stars: 6, timestamp: BASE }]
      );

      const response = await request(app, `/ranked-batches/${recorded?.rankedBatchId}`);
      expectStatus(response, 200);

      const body = (await response.json()) as RankedBatchResponse;
      expect(body.rankedBatch).toMatchObject({ leaderboardCount: 1, newLeaderboardCount: 1 });
      expect(body.leaderboards.map(leaderboard => leaderboard.leaderboardId)).toEqual([TEST_LEADERBOARD_ID]);
      expect(body.newLeaderboards).toHaveLength(1);
      expect(body.newLeaderboards[0]).toMatchObject({
        leaderboardId: TEST_LEADERBOARD_QUALIFIED_ID,
        stars: 6,
      });
    });

    test("returns 404 for an unknown ranked batch", async () => {
      await expectNotFound(await request(app, "/ranked-batches/999999"), "Ranked Batch");
    });

    test("rejects an invalid id", async () => {
      await expectValidationError(await request(app, "/ranked-batches/0"));
      await expectValidationError(await request(app, "/ranked-batches/abc"));
    });
  });

  describe("GET /ranked-batches/:rankedBatchId/players", () => {
    test("lists only gaining players as gains and only losing players as losses, biggest first", async () => {
      const rankedBatchId = await seedCapturedRankedBatch();

      const gains = (await (
        await request(app, `/ranked-batches/${rankedBatchId}/players`)
      ).json()) as RankedBatchPlayersPageResponse;
      expect(gains.items.map(item => item.playerId)).toEqual([TEST_PLAYER_ID]);
      expect(gains.items[0]).toMatchObject({ name: "TestPlayer", scoresChanged: 1 });
      expect(gains.items[0]?.ppDelta).toBeCloseTo(50, 6);
      expect(gains.metadata.totalItems).toBe(1);

      const losses = (await (
        await request(app, `/ranked-batches/${rankedBatchId}/players?direction=loss`)
      ).json()) as RankedBatchPlayersPageResponse;
      expect(losses.items.map(item => item.playerId)).toEqual([TEST_PLAYER_TWO_ID]);
      expect(losses.items[0]?.ppDelta).toBeLessThan(0);
      expectPaginationMetadata(losses.metadata, 1);
    });

    test("never lists a player who did not move in the wrong direction", async () => {
      const rankedBatchId = await seedCapturedRankedBatch();
      await db
        .update(scoreSaberRankedBatchPlayersTable)
        .set({ ppDelta: -5 })
        .where(eq(scoreSaberRankedBatchPlayersTable.playerId, TEST_PLAYER_ID));

      const gains = (await (
        await request(app, `/ranked-batches/${rankedBatchId}/players`)
      ).json()) as RankedBatchPlayersPageResponse;
      expect(gains.items).toEqual([]);
      expect(gains.metadata.totalItems).toBe(0);
    });

    test("leaves out inactive players", async () => {
      const rankedBatchId = await seedCapturedRankedBatch();
      await db.insert(scoreSaberRankedBatchPlayersTable).values({
        rankedBatchId,
        playerId: TEST_INACTIVE_PLAYER_ID,
        ppBefore: 10,
        ppAfter: 500,
        ppDelta: 490,
        scoresChanged: 1,
      });

      const body = (await (
        await request(app, `/ranked-batches/${rankedBatchId}/players`)
      ).json()) as RankedBatchPlayersPageResponse;
      expect(body.items.map(item => item.playerId)).not.toContain(TEST_INACTIVE_PLAYER_ID);
      expect(body.metadata.totalItems).toBe(1);
    });

    test("rejects an invalid direction and returns 404 for an unknown ranked batch", async () => {
      const rankedBatchId = await seedCapturedRankedBatch();

      await expectValidationError(
        await request(app, `/ranked-batches/${rankedBatchId}/players?direction=sideways`)
      );
      await expectNotFound(await request(app, "/ranked-batches/999999/players"), "Ranked Batch");
    });
  });

  describe("ppPending", () => {
    test("is true while a ranked batch's pp changes are not captured and false afterwards", async () => {
      await seedUnchangedScore();
      await RankedBatchService.recordStarChanges(DEFAULT_REALM_ID, [
        { leaderboardId: TEST_LEADERBOARD_ID, previousStars: 8, newStars: 9, timestamp: BASE },
      ]);
      const [row] = await getRankedBatchRows();
      const rankedBatchId = row?.id as number;

      const pending = (await (
        await request(app, `/ranked-batches/${rankedBatchId}`)
      ).json()) as RankedBatchResponse;
      expect(pending.rankedBatch.ppPending).toBe(true);

      stubRealmScores(new Map([[TEST_LEADERBOARD_ID, [{ id: TEST_SCORE_ID, pp: 300 }]]]));
      await RankedBatchService.processPendingPpChanges();

      const done = (await (
        await request(app, `/ranked-batches/${rankedBatchId}`)
      ).json()) as RankedBatchResponse;
      expect(done.rankedBatch.ppPending).toBe(false);

      const list = (await (await request(app, "/ranked-batches")).json()) as RankedBatchesPageResponse;
      expect(list.items[0]?.ppPending).toBe(false);
    });
  });

  describe("GET /leaderboard/by-id/:leaderboardId/star-history", () => {
    test("includes the ranked batch a star change belongs to", async () => {
      const rankedBatchId = await recordSeededStarChange(BASE, 8, 8.5);

      const response = await request(app, `/leaderboard/by-id/${TEST_LEADERBOARD_ID}/star-history`);
      expectStatus(response, 200);

      const body = (await response.json()) as Array<{ newStars: number; rankedBatchId?: number }>;
      expect(body.find(change => change.newStars === 8.5)?.rankedBatchId).toBe(rankedBatchId);
    });
  });

  describe("GET /ranked-batches/player/:playerId", () => {
    test("returns the ranked batches that changed the player's pp", async () => {
      const rankedBatchId = await seedCapturedRankedBatch();

      const response = await request(app, `/ranked-batches/player/${TEST_PLAYER_ID}`);
      expectStatus(response, 200);

      const body = (await response.json()) as PlayerRankedBatchesResponse;
      expect(body).toHaveLength(1);
      expect(body[0]?.rankedBatch.id).toBe(rankedBatchId);
      expect(body[0]?.ppDelta).toBeCloseTo(50, 6);
      expect(body[0]?.scoresChanged).toBe(1);
    });

    test("returns nothing for a player no ranked batch changed", async () => {
      await seedCapturedRankedBatch();

      const body = (await (
        await request(app, `/ranked-batches/player/${UNKNOWN_PLAYER_ID}`)
      ).json()) as PlayerRankedBatchesResponse;
      expect(body).toEqual([]);
    });
  });

  describe("GET /ranked-batches/player/:playerId/:rankedBatchId/scores", () => {
    test("returns the changed scores of the player with their leaderboards", async () => {
      const rankedBatchId = await seedCapturedRankedBatch();

      const response = await request(app, `/ranked-batches/player/${TEST_PLAYER_ID}/${rankedBatchId}/scores`);
      expectStatus(response, 200);

      const body = (await response.json()) as PlayerRankedBatchScoresResponse;
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
      const rankedBatchId = await seedCapturedRankedBatch();
      await db.insert(scoreSaberRankedBatchScoresTable).values([
        {
          rankedBatchId,
          scoreId: 9001,
          playerId: TEST_PLAYER_ID,
          leaderboardId: TEST_LEADERBOARD_ID,
          ppBefore: 200,
          ppAfter: 150,
        },
        {
          rankedBatchId,
          scoreId: 9002,
          playerId: TEST_PLAYER_ID,
          leaderboardId: TEST_LEADERBOARD_ID,
          ppBefore: 100,
          ppAfter: 180,
        },
      ]);

      const body = (await (
        await request(app, `/ranked-batches/player/${TEST_PLAYER_ID}/${rankedBatchId}/scores`)
      ).json()) as PlayerRankedBatchScoresResponse;

      expect(body.map(score => score.scoreId)).toEqual([9002, TEST_SCORE_ID, 9001]);
    });

    test("returns 404 when the player has no changed scores in the ranked batch", async () => {
      const rankedBatchId = await seedCapturedRankedBatch();

      await expectNotFound(
        await request(app, `/ranked-batches/player/${UNKNOWN_PLAYER_ID}/${rankedBatchId}/scores`),
        "No score changes"
      );
    });
  });
});

describe("buildRankedBatchMessage", () => {
  const pasteUrl = "https://paste.example/abc";

  test("pings the role and links the new ranked batch", () => {
    const message = buildRankedBatchMessage(pasteUrl, false, {
      rankedBatchId: 7,
      isNew: true,
      alreadyNotified: false,
    });

    expect(message).toContain("<@&1338261690952978442>");
    expect(message).toContain(`New Ranked Batch: ${pasteUrl}`);
    expect(message).toContain(`${env.NEXT_PUBLIC_WEBSITE_URL}/ranked-batches/7`);
  });

  test("does not ping again for star changes merged into an announced ranked batch, but still links it", () => {
    const message = buildRankedBatchMessage(pasteUrl, false, {
      rankedBatchId: 7,
      isNew: false,
      alreadyNotified: true,
    });

    expect(message).not.toContain("<@&");
    expect(message).toContain(pasteUrl);
    expect(message).toContain(`${env.NEXT_PUBLIC_WEBSITE_URL}/ranked-batches/7`);
  });

  test("still pings when a merged batch also ranked new maps", () => {
    const message = buildRankedBatchMessage(pasteUrl, true, {
      rankedBatchId: 7,
      isNew: false,
      alreadyNotified: true,
    });

    expect(message).toContain("<@&1338261690952978442>");
    expect(message).toContain(`${env.NEXT_PUBLIC_WEBSITE_URL}/ranked-batches/7`);
  });

  test("pings without a link when the batch has no ranked batch", () => {
    const message = buildRankedBatchMessage(pasteUrl, true, undefined);

    expect(message).toBe(`<@&1338261690952978442> New Ranked Batch: ${pasteUrl}`);
  });
});

beforeEach(() => {
  stubRealmScores(new Map());
});
