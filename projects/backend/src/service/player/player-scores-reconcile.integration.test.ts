import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { eq } from "drizzle-orm";
import { HttpResponse } from "msw";
import {
  TEST_LEADERBOARD_QUALIFIED_ID,
  TEST_PLAYER_ID,
  TEST_SCORE_ID,
} from "../../../test/helpers/constants";
import { server } from "../../../test/helpers/msw-server";
import { scoreSaberApi } from "../../../test/helpers/scoresaber-api.test-utils";
import { db } from "../../db";
import { scoreSaberScoreRealmsTable, scoreSaberScoresTable } from "../../db/schema";
import { ScoreSaberAccountsRepository } from "../../repositories/scoresaber-accounts.repository";
import { PlayerCoreService } from "./player-core.service";
import { PlayerScoresService } from "./player-scores.service";

const ITEMS_PER_PAGE = 100;
const UNRANKED_SCORE_ID = 900_010;

function serveScorePages(pages: Map<number, number[] | undefined>, total: number) {
  const requestedPages: number[] = [];
  server.use(
    scoreSaberApi("/player/:id/scores", ({ params, searchParams }) => {
      const page = Number(searchParams.get("page") ?? "1");
      requestedPages.push(page);
      const scoreIds = pages.get(page);
      if (params.id !== TEST_PLAYER_ID || scoreIds === undefined) {
        return new HttpResponse(null, { status: 404 });
      }

      return HttpResponse.json({
        playerScores: scoreIds.map(id => ({ score: { id } })),
        metadata: { total, page, itemsPerPage: ITEMS_PER_PAGE },
      });
    })
  );
  return requestedPages;
}

async function storedScoreIds() {
  const rows = await db
    .select({ scoreId: scoreSaberScoresTable.scoreId })
    .from(scoreSaberScoresTable)
    .where(eq(scoreSaberScoresTable.playerId, TEST_PLAYER_ID));
  return rows.map(row => row.scoreId).sort((a, b) => a - b);
}

async function storedMedals() {
  return (await ScoreSaberAccountsRepository.findRowById(TEST_PLAYER_ID))?.medals;
}

describe("PlayerScoresService.reconcilePlayerScores", () => {
  let invalidateCaches: ReturnType<typeof spyOn<typeof PlayerCoreService, "invalidatePlayerCaches">>;

  beforeEach(async () => {
    invalidateCaches = spyOn(PlayerCoreService, "invalidatePlayerCaches");

    await db.insert(scoreSaberScoresTable).values({
      scoreId: UNRANKED_SCORE_ID,
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
      timestamp: new Date("2024-06-01T12:00:00.000Z"),
    });
    await db.insert(scoreSaberScoreRealmsTable).values({
      scoreId: UNRANKED_SCORE_ID,
      realmId: DEFAULT_REALM_ID,
      playerId: TEST_PLAYER_ID,
      leaderboardId: TEST_LEADERBOARD_QUALIFIED_ID,
      pp: 0,
    });
  });

  afterEach(() => {
    invalidateCaches.mockRestore();
  });

  test("deletes only the scores ScoreSaber no longer has", async () => {
    expect(await storedMedals()).toBe(1);
    serveScorePages(new Map([[1, [UNRANKED_SCORE_ID]]]), 1);

    await PlayerScoresService.reconcilePlayerScores(TEST_PLAYER_ID);

    expect(await storedScoreIds()).toEqual([UNRANKED_SCORE_ID]);
    expect(await storedMedals()).toBe(0);
    expect(invalidateCaches).toHaveBeenCalledTimes(1);
    expect(invalidateCaches).toHaveBeenCalledWith(TEST_PLAYER_ID);
  });

  test("changes nothing when our scores already match", async () => {
    serveScorePages(new Map([[1, [TEST_SCORE_ID, UNRANKED_SCORE_ID]]]), 2);

    await PlayerScoresService.reconcilePlayerScores(TEST_PLAYER_ID);

    expect(await storedScoreIds()).toEqual([TEST_SCORE_ID, UNRANKED_SCORE_ID]);
    expect(await storedMedals()).toBe(1);
    expect(invalidateCaches).not.toHaveBeenCalled();
  });

  test("does not delete anything when the collected ids don't add up to ScoreSaber's total", async () => {
    serveScorePages(new Map([[1, [UNRANKED_SCORE_ID]]]), 2);

    await PlayerScoresService.reconcilePlayerScores(TEST_PLAYER_ID);

    expect(await storedScoreIds()).toEqual([TEST_SCORE_ID, UNRANKED_SCORE_ID]);
    expect(await storedMedals()).toBe(1);
  });

  test("aborts without changes when a later page fails to load", async () => {
    const requestedPages = serveScorePages(new Map([[1, [UNRANKED_SCORE_ID]]]), ITEMS_PER_PAGE + 1);

    await PlayerScoresService.reconcilePlayerScores(TEST_PLAYER_ID);

    expect(requestedPages).toEqual([1, 2]);
    expect(await storedScoreIds()).toEqual([TEST_SCORE_ID, UNRANKED_SCORE_ID]);
    expect(invalidateCaches).not.toHaveBeenCalled();
  });

  test("aborts without changes when the first page fails to load", async () => {
    const requestedPages = serveScorePages(new Map(), 0);

    await PlayerScoresService.reconcilePlayerScores(TEST_PLAYER_ID);

    expect(requestedPages).toEqual([1]);
    expect(await storedScoreIds()).toEqual([TEST_SCORE_ID, UNRANKED_SCORE_ID]);
    expect(invalidateCaches).not.toHaveBeenCalled();
  });
});
