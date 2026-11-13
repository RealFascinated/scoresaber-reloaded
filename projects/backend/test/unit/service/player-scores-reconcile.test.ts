import type { ScoreSaberPlayerScoresPageToken } from "@ssr/common/schemas/scoresaber/tokens/v1/player-scores-page";
import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { ScoreSaberLeaderboardsRepository } from "../../../src/repositories/scoresaber-leaderboards.repository";
import { ScoreSaberScoresRepository } from "../../../src/repositories/scoresaber-scores.repository";
import { ScoreSaberApiService } from "../../../src/service/external/scoresaber-api.service";
import { PlayerMedalsService } from "../../../src/service/medals/player-medals.service";
import { PlayerCoreService } from "../../../src/service/player/player-core.service";
import { PlayerScoresService } from "../../../src/service/player/player-scores.service";
import { ScoreCoreService } from "../../../src/service/score/score-core.service";

const PLAYER_ID = "reconcile-player";
const ITEMS_PER_PAGE = 100;

/** Builds a scores page that only carries what the reconcile reads: score ids and the metadata. */
function buildPage(scoreIds: number[], total: number): ScoreSaberPlayerScoresPageToken {
  return {
    playerScores: scoreIds.map(id => ({ score: { id } })),
    metadata: { total, page: 1, itemsPerPage: ITEMS_PER_PAGE },
  } as ScoreSaberPlayerScoresPageToken;
}

describe("PlayerScoresService.reconcilePlayerScores", () => {
  let lookupPlayerScores: ReturnType<typeof spyOn<typeof ScoreSaberApiService, "lookupPlayerScores">>;
  let findScoreIds: ReturnType<typeof spyOn<typeof ScoreSaberScoresRepository, "findScoreIdsByPlayerId">>;
  let findLeaderboardIds: ReturnType<
    typeof spyOn<typeof ScoreSaberScoresRepository, "findLeaderboardIdsByScoreIds">
  >;
  let deleteScores: ReturnType<typeof spyOn<typeof ScoreSaberScoresRepository, "deleteByPlayerAndScoreIds">>;
  let trackBatch: ReturnType<typeof spyOn<typeof ScoreCoreService, "trackScoreSaberScoresBatch">>;
  let refreshMedals: ReturnType<typeof spyOn<typeof PlayerMedalsService, "refreshLeaderboardsMedals">>;
  let getLeaderboards: ReturnType<
    typeof spyOn<typeof ScoreSaberLeaderboardsRepository, "getLeaderboardsByIds">
  >;
  let syncMedalTotals: ReturnType<typeof spyOn<typeof PlayerMedalsService, "syncPlayersMedalTotals">>;
  let invalidateCaches: ReturnType<typeof spyOn<typeof PlayerCoreService, "invalidatePlayerCaches">>;

  beforeEach(() => {
    lookupPlayerScores = spyOn(ScoreSaberApiService, "lookupPlayerScores");
    findScoreIds = spyOn(ScoreSaberScoresRepository, "findScoreIdsByPlayerId");
    findLeaderboardIds = spyOn(ScoreSaberScoresRepository, "findLeaderboardIdsByScoreIds").mockResolvedValue(
      []
    );
    deleteScores = spyOn(ScoreSaberScoresRepository, "deleteByPlayerAndScoreIds").mockResolvedValue();
    trackBatch = spyOn(ScoreCoreService, "trackScoreSaberScoresBatch").mockResolvedValue([]);
    refreshMedals = spyOn(PlayerMedalsService, "refreshLeaderboardsMedals").mockResolvedValue();
    getLeaderboards = spyOn(ScoreSaberLeaderboardsRepository, "getLeaderboardsByIds").mockResolvedValue([]);
    syncMedalTotals = spyOn(PlayerMedalsService, "syncPlayersMedalTotals").mockResolvedValue();
    invalidateCaches = spyOn(PlayerCoreService, "invalidatePlayerCaches").mockResolvedValue();
  });

  afterEach(() => {
    for (const spy of [
      lookupPlayerScores,
      findScoreIds,
      findLeaderboardIds,
      deleteScores,
      trackBatch,
      refreshMedals,
      getLeaderboards,
      syncMedalTotals,
      invalidateCaches,
    ]) {
      spy.mockRestore();
    }
  });

  test("deletes only the scores ScoreSaber no longer has", async () => {
    lookupPlayerScores.mockResolvedValue(buildPage([1, 2], 2));
    findScoreIds.mockResolvedValue(new Set([1, 2, 3]));
    findLeaderboardIds.mockResolvedValue([77]);

    await PlayerScoresService.reconcilePlayerScores(PLAYER_ID);

    expect(deleteScores).toHaveBeenCalledTimes(1);
    expect(deleteScores).toHaveBeenCalledWith(PLAYER_ID, [3]);
    expect(findLeaderboardIds).toHaveBeenCalledWith(PLAYER_ID, [3]);
    expect(getLeaderboards).toHaveBeenCalledTimes(1);
    expect(syncMedalTotals).toHaveBeenCalledWith([PLAYER_ID]);
    expect(invalidateCaches).toHaveBeenCalledWith(PLAYER_ID);
  });

  test("changes nothing when our scores already match", async () => {
    lookupPlayerScores.mockResolvedValue(buildPage([1, 2], 2));
    findScoreIds.mockResolvedValue(new Set([1, 2]));

    await PlayerScoresService.reconcilePlayerScores(PLAYER_ID);

    expect(deleteScores).not.toHaveBeenCalled();
    expect(getLeaderboards).not.toHaveBeenCalled();
    expect(refreshMedals).not.toHaveBeenCalled();
    expect(syncMedalTotals).not.toHaveBeenCalled();
    expect(invalidateCaches).not.toHaveBeenCalled();
  });

  test("does not delete anything when the collected ids don't add up to ScoreSaber's total", async () => {
    // ScoreSaber reports 3 scores but the page only carried 2 (e.g. pages shifted while fetching)
    lookupPlayerScores.mockResolvedValue(buildPage([1, 2], 3));
    findScoreIds.mockResolvedValue(new Set([1, 2, 3]));

    await PlayerScoresService.reconcilePlayerScores(PLAYER_ID);

    expect(deleteScores).not.toHaveBeenCalled();
  });

  test("aborts without changes when a later page fails to load", async () => {
    lookupPlayerScores.mockImplementation(async ({ page }) =>
      page === 1 ? buildPage([1, 2], ITEMS_PER_PAGE + 1) : undefined
    );
    findScoreIds.mockResolvedValue(new Set([1, 2, 3]));

    await PlayerScoresService.reconcilePlayerScores(PLAYER_ID);

    expect(trackBatch).not.toHaveBeenCalled();
    expect(deleteScores).not.toHaveBeenCalled();
    expect(invalidateCaches).not.toHaveBeenCalled();
  });

  test("aborts without changes when the first page fails to load", async () => {
    lookupPlayerScores.mockResolvedValue(undefined);

    await PlayerScoresService.reconcilePlayerScores(PLAYER_ID);

    expect(findScoreIds).not.toHaveBeenCalled();
    expect(deleteScores).not.toHaveBeenCalled();
  });
});
