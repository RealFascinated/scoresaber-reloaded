import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import Logger from "@ssr/common/logger";
import { Player, PlayerModel } from "@ssr/common/model/player/player";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import type { BeatLeaderPlayerScoresPageToken } from "@ssr/common/schemas/beatleader/tokens/score/page";
import { BeatLeaderScoreToken } from "@ssr/common/schemas/beatleader/tokens/score/score";
import type { MapDifficulty } from "@ssr/common/score/map-difficulty";
import type { MapCharacteristic } from "@ssr/common/types/map-characteristic";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { formatDuration } from "@ssr/common/utils/time-utils";
import BeatLeaderService from "../beatleader.service";
import { LeaderboardCoreService } from "../leaderboard/leaderboard-core.service";

type SeedMode = "backfill" | "requested";

const BEATLEADER_PAGE_SIZE = 100;
const MAX_LOOKUP_ATTEMPTS = 3;

export class PlayerBeatLeaderScoresService {
  /**
   * Links a BeatLeader score to a ScoreSaber score.
   *
   * @param scoreToken the score token
   */
  private static async linkScoreSaberScoreBeatLeaderId(scoreToken: BeatLeaderScoreToken): Promise<void> {
    const hash = scoreToken.leaderboard.song.hash.toUpperCase();
    const difficulty = scoreToken.leaderboard.difficulty.difficultyName as MapDifficulty;
    const characteristic = scoreToken.leaderboard.difficulty.modeName as MapCharacteristic;

    const leaderboardResponse = await LeaderboardCoreService.getLeaderboardByHash(hash, difficulty, characteristic, {
      includeBeatSaver: false,
      includeStarChangeHistory: false,
    });
    if (leaderboardResponse == undefined) {
      return;
    }

    const leaderboard = leaderboardResponse.leaderboard;
    await ScoreSaberScoreModel.updateOne(
      {
        playerId: scoreToken.playerId,
        leaderboardId: leaderboard._id,
        score: scoreToken.baseScore,
      },
      { $set: { beatLeaderScoreId: scoreToken.id } }
    );
  }

  /**
   * Fetches missing BeatLeader scores for a player.
   *
   * @param player the player to fetch scores for
   * @param options the options
   * @returns the result
   */
  public static async fetchMissingBeatLeaderScores(
    player: Player,
    options: { mode: SeedMode }
  ): Promise<{
    totalPagesFetched: number;
    newScoresTracked: number;
    stoppedBecauseAllTrackedPage: boolean;
    timeTaken: number;
  }> {
    const empty = (): {
      totalPagesFetched: number;
      newScoresTracked: number;
      stoppedBecauseAllTrackedPage: boolean;
      timeTaken: number;
    } => ({
      totalPagesFetched: 0,
      newScoresTracked: 0,
      stoppedBecauseAllTrackedPage: false,
      timeTaken: 0,
    });

    const playerId = player._id;
    if (!playerId) {
      return empty();
    }

    if (player.banned) {
      if (!player.seededBeatLeaderScores) {
        await PlayerModel.updateOne({ _id: playerId }, { $set: { seededBeatLeaderScores: true } });
      }
      return empty();
    }

    const startTime = performance.now();
    const beatLeaderApi = ApiServiceRegistry.getInstance().getBeatLeaderService();

    const result = {
      totalPagesFetched: 0,
      newScoresTracked: 0,
      stoppedBecauseAllTrackedPage: false,
      timeTaken: 0,
    };

    /**
     * Gets a page of BeatLeader scores for the player.
     *
     * @param page the page to get
     * @returns the scores page
     */
    async function getScoresPage(page: number): Promise<BeatLeaderPlayerScoresPageToken | undefined> {
      for (let attempt = 0; attempt < MAX_LOOKUP_ATTEMPTS; attempt++) {
        const scoresPage = await beatLeaderApi.lookupPlayerScores(playerId, page, {
          count: BEATLEADER_PAGE_SIZE,
          sortBy: "date",
          order: "desc",
          leaderboardContext: "general",
          includeIO: true,
        });
        if (scoresPage) {
          return scoresPage;
        }
      }
      return undefined;
    }

    function maxPageFromMetadata(scoresPage: BeatLeaderPlayerScoresPageToken): number {
      const { total, itemsPerPage } = scoresPage.metadata;
      const ipp = Math.max(1, itemsPerPage);
      return Math.ceil(total / ipp);
    }

    /**
     * Whether there is another page after this one.
     *
     * Uses BeatLeader’s `metadata.total` and `metadata.itemsPerPage` (same fields the API uses for paging).
     *
     * @param currentPage the page that was just processed
     * @param scoresPage the page token
     */
    function hasMorePages(currentPage: number, scoresPage: BeatLeaderPlayerScoresPageToken): boolean {
      return currentPage < maxPageFromMetadata(scoresPage);
    }

    /**
     * Tracks scores on this page that are not already stored.
     *
     * @param scoresPage the page to process
     * @returns counts and whether the page was already fully tracked
     */
    async function processPageScores(
      scoresPage: BeatLeaderPlayerScoresPageToken
    ): Promise<{ newTracked: number; fullPageAlreadyTracked: boolean }> {
      const scores = scoresPage.data ?? [];
      if (scores.length === 0) {
        return { newTracked: 0, fullPageAlreadyTracked: true };
      }

      const scoreIds = scores.map(score => score.id);
      const existing = await BeatLeaderService.scoresExist(scoreIds);
      const uniqueIdsCount = new Set(scoreIds).size;
      const fullPageAlreadyTracked = existing.size >= uniqueIdsCount;

      if (fullPageAlreadyTracked) {
        return { newTracked: 0, fullPageAlreadyTracked: true };
      }

      let newTracked = 0;
      for (const scoreToken of scores) {
        if (existing.has(scoreToken.id)) {
          continue;
        }
        const tracked = await BeatLeaderService.trackBeatLeaderScore(
          scoreToken as BeatLeaderScoreToken,
          false
        );
        if (tracked) {
          newTracked++;
          try {
            await PlayerBeatLeaderScoresService.linkScoreSaberScoreBeatLeaderId(
              scoreToken as BeatLeaderScoreToken
            );
          } catch (error) {
            Logger.warn(
              `[BeatLeader Seed] Failed to link ScoreSaber score for BeatLeader score %s (player %s): %s`,
              scoreToken.id,
              scoreToken.playerId,
              error instanceof Error ? error.message : String(error)
            );
          }
        }
      }

      return { newTracked, fullPageAlreadyTracked: false };
    }

    let currentPage = 1;
    let exitedDueToApiFailure = false;
    let lastSuccessfulScoresPage: BeatLeaderPlayerScoresPageToken | undefined;

    while (true) {
      const scoresPage = await getScoresPage(currentPage);
      if (!scoresPage) {
        exitedDueToApiFailure = true;
        if (lastSuccessfulScoresPage !== undefined) {
          const maxPage = maxPageFromMetadata(lastSuccessfulScoresPage);
          Logger.warn(
            `[BeatLeader Seed] Stopped fetching for player %s: BeatLeader API returned no page after %s attempt(s) (page %s of %s)`,
            playerId,
            formatNumberWithCommas(MAX_LOOKUP_ATTEMPTS),
            formatNumberWithCommas(currentPage),
            formatNumberWithCommas(maxPage)
          );
        } else {
          Logger.warn(
            `[BeatLeader Seed] Stopped fetching for player %s: BeatLeader API returned no page after %s attempt(s) (page %s)`,
            playerId,
            formatNumberWithCommas(MAX_LOOKUP_ATTEMPTS),
            formatNumberWithCommas(currentPage)
          );
        }
        break;
      }

      lastSuccessfulScoresPage = scoresPage;

      const scores = scoresPage.data ?? [];
      if (scores.length === 0) {
        break;
      }

      const { newTracked, fullPageAlreadyTracked } = await processPageScores(scoresPage);
      result.newScoresTracked += newTracked;

      if (options.mode === "requested" && fullPageAlreadyTracked) {
        result.stoppedBecauseAllTrackedPage = true;
        break;
      }

      const hasMore = hasMorePages(currentPage, scoresPage);
      if (!hasMore) {
        break;
      }

      currentPage++;
    }

    result.timeTaken = performance.now() - startTime;
    result.totalPagesFetched = currentPage - 1;

    /** True when the only failure was loading the last page (page N of N); earlier pages succeeded. */
    const failedOnLastPageOnly =
      exitedDueToApiFailure &&
      lastSuccessfulScoresPage !== undefined &&
      currentPage === maxPageFromMetadata(lastSuccessfulScoresPage);

    if (!player.seededBeatLeaderScores) {
      if (options.mode === "backfill") {
        if (!exitedDueToApiFailure || failedOnLastPageOnly) {
          await PlayerModel.updateOne({ _id: playerId }, { $set: { seededBeatLeaderScores: true } });
        }
      } else if (result.stoppedBecauseAllTrackedPage) {
        await PlayerModel.updateOne({ _id: playerId }, { $set: { seededBeatLeaderScores: true } });
      }
    }

    if (currentPage !== 1) {
      Logger.info(
        `[BeatLeader Seed] Player %s fetched %s page(s), tracked %s new score(s), in %s`,
        playerId,
        formatNumberWithCommas(result.totalPagesFetched),
        formatNumberWithCommas(result.newScoresTracked),
        formatDuration(result.timeTaken)
      );
    }

    return result;
  }
}
