import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import Logger from "@ssr/common/logger";
import type { BeatLeaderPlayerScoresPageToken } from "@ssr/common/schemas/beatleader/tokens/score/page";
import { BeatLeaderScoreToken } from "@ssr/common/schemas/beatleader/tokens/score/score";
import { ScoreSaberAccount } from "@ssr/common/schemas/scoresaber/account";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { formatDuration } from "@ssr/common/utils/time-utils";
import BeatLeaderService from "../beatleader.service";
import { PlayerCoreService } from "./player-core.service";

type SeedMode = "backfill" | "requested";

export class PlayerBeatLeaderScoresService {
  /**
   * Fetches missing BeatLeader scores for a player.
   *
   * @param player the player to fetch scores for
   * @param options the options
   * @returns the result
   */
  public static async fetchMissingBeatLeaderScores(
    account: ScoreSaberAccount,
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

    const playerId = account.id;
    if (account.banned) {
      if (!account.seededBeatLeaderScores) {
        await PlayerCoreService.updatePlayer(account.id, { seededBeatLeaderScores: true });
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
      const scoresPage = await beatLeaderApi.lookupPlayerScores(playerId, page, {
        count: 100,
        sortBy: "date",
        order: "desc",
        leaderboardContext: "general",
      });
      return scoresPage;
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
        }
      }

      return { newTracked, fullPageAlreadyTracked: false };
    }

    let currentPage = 1;
    while (true) {
      const scoresPage = await getScoresPage(currentPage);
      if (!scoresPage) {
        break;
      }

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

    await PlayerCoreService.updatePlayer(playerId, { seededBeatLeaderScores: true });

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
