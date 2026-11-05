import Logger, { type ScopedLogger } from "@ssr/common/logger";
import type { BeatLeaderPlayerScoresPageToken } from "@ssr/common/schemas/beatleader/tokens/score/page";
import { BeatLeaderScoreToken } from "@ssr/common/schemas/beatleader/tokens/score/score";
import { ScoreSaberAccount } from "@ssr/common/schemas/scoresaber/account";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { BeatLeaderScoresRepository } from "../../repositories/beatleader-scores.repository";
import { ScoreSaberAccountsRepository } from "../../repositories/scoresaber-accounts.repository";
import BeatLeaderService from "../beatleader/beatleader.service";
import {
  BeatLeaderApiService,
  type BeatLeaderPlayerScoresPageResult,
} from "../external/beatleader-api.service";
import { PlayerCoreService } from "./player-core.service";

type SeedMode = "backfill" | "requested";

type SeedResult = {
  totalPagesFetched: number;
  newScoresTracked: number;
  stoppedBecauseAllTrackedPage: boolean;
  timeTaken: number;
};

export class PlayerBeatLeaderScoresService {
  private static readonly logger: ScopedLogger = Logger.withTopic("BeatLeader Player Scores");

  /**
   * Pages re-fetched before the saved checkpoint when a seed resumes, so scores that
   * moved down a page while the seed was paused are not skipped.
   */
  private static readonly RESUME_OVERLAP_PAGES = 1;

  /**
   * Fetches missing BeatLeader scores for a player.
   *
   * A player is only marked seeded once the whole score history has been walked or
   * BeatLeader reports there is nothing more, because an incomplete backfill would
   * leave those scores untracked for good. Progress is checkpointed on every failed
   * attempt so the next one resumes instead of re-fetching the history from page 1.
   *
   * @param account the player to fetch scores for
   * @param options the options
   * @returns the result
   */
  public static async fetchMissingBeatLeaderScores(
    account: ScoreSaberAccount,
    options: { mode: SeedMode }
  ): Promise<SeedResult> {
    const playerId = account.id;
    if (account.banned) {
      if (!account.seededBeatLeaderScores) {
        await PlayerBeatLeaderScoresService.markSeeded(account.id);
      }
      return PlayerBeatLeaderScoresService.emptyResult();
    }

    const startTime = performance.now();
    const progress = await ScoreSaberAccountsRepository.findBeatLeaderSeedProgress(playerId);
    const previousAttempts = progress?.attempts ?? 0;

    const result = PlayerBeatLeaderScoresService.emptyResult();

    /**
     * Gets a page of BeatLeader scores for the player.
     *
     * @param page the page to get
     * @returns the page along with the HTTP status BeatLeader answered with
     */
    async function getScoresPage(page: number): Promise<BeatLeaderPlayerScoresPageResult | undefined> {
      return BeatLeaderApiService.requestPlayerScoresPage(playerId, page, {
        count: 100,
        sortBy: "date",
        order: "desc",
        leaderboardContext: "general",
        // The page schema requires a non-null `scoreImprovement`; BeatLeader only
        // includes it when includeIO=true (it is null otherwise), so request it.
        includeIO: true,
      });
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

    // Resume at the page the last attempt stopped on. Restarting from page 1 every
    // time is what kept long score histories unseeded: a single failed page anywhere
    // in the history threw away everything fetched before it.
    let currentPage = Math.max(1, (progress?.page ?? 0) - PlayerBeatLeaderScoresService.RESUME_OVERLAP_PAGES);
    let lastProcessedPage = 0;
    let pagesFetched = 0;
    let sawScores = false;
    let completed = false;

    while (true) {
      const pageResult = await getScoresPage(currentPage);
      if (pageResult == undefined || pageResult.page == undefined) {
        // A 404 is BeatLeader saying this page does not exist: on page 1 the player
        // has no BeatLeader scores at all, deeper in the history simply ends there.
        // Every other failure (429, 5xx, a body that failed validation) is transient
        // and leaves the player unseeded to be resumed from the saved page.
        if (pageResult?.status === 404) {
          completed = true;
        }
        break;
      }

      pagesFetched++;
      const scoresPage = pageResult.page;
      const scores = scoresPage.data ?? [];
      if (scores.length === 0) {
        completed = true;
        break;
      }
      sawScores = true;

      const { newTracked, fullPageAlreadyTracked } = await processPageScores(scoresPage);
      result.newScoresTracked += newTracked;
      lastProcessedPage = currentPage;

      if (options.mode === "requested" && fullPageAlreadyTracked) {
        result.stoppedBecauseAllTrackedPage = true;
        completed = true;
        break;
      }

      if (!hasMorePages(currentPage, scoresPage)) {
        completed = true;
        break;
      }

      currentPage++;
    }

    result.timeTaken = performance.now() - startTime;
    result.totalPagesFetched = pagesFetched;

    if (!completed) {
      await PlayerBeatLeaderScoresService.recordAttempt(playerId, lastProcessedPage, previousAttempts);
    } else {
      // Cache the player's linked BeatLeader account IDs so real-time scores are
      // attributed to this account even when their BeatLeader ID differs. A player
      // with no BeatLeader scores has nothing to attribute, so it is seeded without a
      // mapping; the real-time path resolves the mapping for their first score.
      const mapping = await BeatLeaderService.upsertBeatLeaderPlayer(account.id);
      if (mapping || !sawScores) {
        await PlayerBeatLeaderScoresService.markSeeded(playerId);
      } else {
        PlayerBeatLeaderScoresService.logger.warn(
          `Failed to cache BeatLeader mapping for "${playerId}"; leaving the player unseeded for retry`
        );
        await PlayerBeatLeaderScoresService.recordAttempt(playerId, lastProcessedPage, previousAttempts);
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

  /**
   * Marks a player's BeatLeader scores seeded and clears its backfill checkpoint.
   *
   * @param playerId the player's id
   */
  private static async markSeeded(playerId: string): Promise<void> {
    await PlayerCoreService.updatePlayer(playerId, {
      seededBeatLeaderScores: true,
      beatLeaderSeedPage: 0,
      beatLeaderSeedAttempts: 0,
      beatLeaderSeedLastAttempt: null,
    });
  }

  /**
   * Records a failed attempt: the page the next attempt resumes from, and the attempt
   * count that decides how soon the player is queued again.
   *
   * @param playerId the player's id
   * @param page the last page that was processed
   * @param attempts the attempts recorded before this one
   */
  private static async recordAttempt(playerId: string, page: number, attempts: number): Promise<void> {
    await PlayerCoreService.updatePlayer(playerId, {
      beatLeaderSeedPage: Math.max(0, page),
      beatLeaderSeedAttempts: attempts + 1,
      beatLeaderSeedLastAttempt: new Date(),
    });
  }

  private static emptyResult(): SeedResult {
    return { totalPagesFetched: 0, newScoresTracked: 0, stoppedBecauseAllTrackedPage: false, timeTaken: 0 };
  }
}
