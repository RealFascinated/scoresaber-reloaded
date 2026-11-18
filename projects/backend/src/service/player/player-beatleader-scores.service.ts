import Logger, { type ScopedLogger } from "@ssr/common/logger";
import type { BeatLeaderPlayerScoresPageToken } from "@ssr/common/schemas/beatleader/tokens/score/page";
import { BeatLeaderScoreToken } from "@ssr/common/schemas/beatleader/tokens/score/score";
import { ScoreSaberAccount } from "@ssr/common/schemas/scoresaber/account";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { BeatLeaderScoresRepository } from "../../repositories/beatleader-scores.repository";
import { ScoreSaberAccountsRepository } from "../../repositories/scoresaber-accounts.repository";
import BeatLeaderService from "../beatleader/beatleader.service";
import { BeatLeaderApiService } from "../external/beatleader-api.service";
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
  public static async fetchMissingBeatLeaderScores(account: ScoreSaberAccount, options: { mode: SeedMode }) {
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

    async function getScoresPage(page: number) {
      return BeatLeaderApiService.requestPlayerScoresPage(playerId, page, {
        count: 100,
        sortBy: "date",
        order: "desc",
        leaderboardContext: "general",
        includeIO: true,
      });
    }

    function maxPageFromMetadata(scoresPage: BeatLeaderPlayerScoresPageToken) {
      const { total, itemsPerPage } = scoresPage.metadata;
      const ipp = Math.max(1, itemsPerPage);
      return Math.ceil(total / ipp);
    }

    function hasMorePages(currentPage: number, scoresPage: BeatLeaderPlayerScoresPageToken) {
      return currentPage < maxPageFromMetadata(scoresPage);
    }

    async function processPageScores(scoresPage: BeatLeaderPlayerScoresPageToken) {
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

      const newTracked = await BeatLeaderService.trackBeatLeaderScoresBatch(
        scores as BeatLeaderScoreToken[],
        account.id
      );

      return { newTracked, fullPageAlreadyTracked: false };
    }

    let currentPage = Math.max(1, (progress?.page ?? 0) - PlayerBeatLeaderScoresService.RESUME_OVERLAP_PAGES);
    let lastProcessedPage = 0;
    let pagesFetched = 0;
    let sawScores = false;
    let completed = false;

    while (true) {
      const pageResult = await getScoresPage(currentPage);
      if (pageResult == undefined || pageResult.page == undefined) {
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

  private static async markSeeded(playerId: string) {
    await PlayerCoreService.updatePlayer(playerId, {
      seededBeatLeaderScores: true,
      beatLeaderSeedPage: 0,
      beatLeaderSeedAttempts: 0,
      beatLeaderSeedLastAttempt: null,
    });
  }

  private static async recordAttempt(playerId: string, page: number, attempts: number) {
    await PlayerCoreService.updatePlayer(playerId, {
      beatLeaderSeedPage: Math.max(0, page),
      beatLeaderSeedAttempts: attempts + 1,
      beatLeaderSeedLastAttempt: new Date(),
    });
  }

  private static emptyResult() {
    const result: SeedResult = {
      totalPagesFetched: 0,
      newScoresTracked: 0,
      stoppedBecauseAllTrackedPage: false,
      timeTaken: 0,
    };
    return result;
  }
}
