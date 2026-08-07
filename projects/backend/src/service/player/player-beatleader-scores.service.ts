import Logger, { type ScopedLogger } from "@ssr/common/logger";
import type { BeatLeaderPlayerScoresPageToken } from "@ssr/common/schemas/beatleader/tokens/score/page";
import { BeatLeaderScoreToken } from "@ssr/common/schemas/beatleader/tokens/score/score";
import { ScoreSaberAccount } from "@ssr/common/schemas/scoresaber/account";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { BeatLeaderScoresRepository } from "../../repositories/beatleader-scores.repository";
import BeatLeaderService from "../beatleader/beatleader.service";
import { BeatLeaderApiService } from "../external/beatleader-api.service";
import { PlayerCoreService } from "./player-core.service";

type SeedMode = "backfill" | "requested";

export class PlayerBeatLeaderScoresService {
  private static readonly logger: ScopedLogger = Logger.withTopic("BeatLeader Player Scores");

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
      const scoresPage = await BeatLeaderApiService.lookupPlayerScores(playerId, page, {
        count: 100,
        sortBy: "date",
        order: "desc",
        leaderboardContext: "general",
        // The page schema requires a non-null `scoreImprovement`; BeatLeader only
        // includes it when includeIO=true (it is null otherwise), so request it.
        includeIO: true,
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
      const existing = await BeatLeaderScoresRepository.findExistingIds(Array.from(new Set(scoreIds)));
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
          false,
          false,
          account.id
        );
        if (tracked) {
          newTracked++;
        }
      }

      return { newTracked, fullPageAlreadyTracked: false };
    }

    let currentPage = 1;
    let pagesFetched = 0;
    let completed = false;
    while (true) {
      const scoresPage = await getScoresPage(currentPage);
      if (!scoresPage) {
        // The page fetch failed. Only treat the player as seeded when they
        // definitively do not exist on BeatLeader (404) and there is nothing to
        // backfill; every other failure (rate limit, timeout, 5xx) leaves the
        // player unseeded so the queue retries them.
        if (currentPage === 1) {
          const exists = await BeatLeaderApiService.playerExists(playerId);
          completed = exists === false;
        }
        break;
      }
      pagesFetched++;

      const scores = scoresPage.data ?? [];
      if (scores.length === 0) {
        completed = true;
        break;
      }

      const { newTracked, fullPageAlreadyTracked } = await processPageScores(scoresPage);
      result.newScoresTracked += newTracked;

      if (options.mode === "requested" && fullPageAlreadyTracked) {
        result.stoppedBecauseAllTrackedPage = true;
        completed = true;
        break;
      }

      const hasMore = hasMorePages(currentPage, scoresPage);
      if (!hasMore) {
        completed = true;
        break;
      }

      currentPage++;
    }

    result.timeTaken = performance.now() - startTime;
    result.totalPagesFetched = pagesFetched;

    if (completed) {
      // Cache the player's linked BeatLeader account IDs so real-time scores can be
      // attributed to this account even when their BeatLeader player ID differs.
      // This runs BEFORE marking the player seeded, and the player is only marked
      // seeded when the mapping is confirmed or they definitively have no BeatLeader
      // presence, so a transient failure leaves them unseeded for the next retry.
      const mapping = await BeatLeaderService.upsertBeatLeaderPlayer(account.id);
      if (mapping) {
        await PlayerCoreService.updatePlayer(playerId, { seededBeatLeaderScores: true });
      } else {
        const exists = await BeatLeaderApiService.playerExists(account.id);
        if (exists === false) {
          // No BeatLeader presence — there is nothing to cache, seeding is complete.
          await PlayerCoreService.updatePlayer(playerId, { seededBeatLeaderScores: true });
        } else {
          PlayerBeatLeaderScoresService.logger.warn(
            `Failed to cache BeatLeader mapping for "${playerId}" (exists=${exists}); leaving the player unseeded for retry`
          );
        }
      }
    }

    if (result.newScoresTracked > 0) {
      PlayerBeatLeaderScoresService.logger.info(
        `Player %s fetched %s page(s), tracked %s new score(s), in %s`,
        playerId,
        formatNumberWithCommas(result.totalPagesFetched),
        formatNumberWithCommas(result.newScoresTracked),
        formatDuration(result.timeTaken)
      );
    }

    return result;
  }
}
