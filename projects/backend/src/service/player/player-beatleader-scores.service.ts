import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import Logger from "@ssr/common/logger";
import { ScoreSaberLeaderboardModel } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { Player, PlayerModel } from "@ssr/common/model/player/player";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import type { BeatLeaderPlayerScoresPageToken } from "@ssr/common/schemas/beatleader/tokens/score/page";
import { BeatLeaderScoreToken } from "@ssr/common/schemas/beatleader/tokens/score/score";
import type { MapDifficulty } from "@ssr/common/score/map-difficulty";
import type { MapCharacteristic } from "@ssr/common/types/map-characteristic";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { formatDuration } from "@ssr/common/utils/time-utils";
import BeatLeaderService from "../beatleader.service";

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

    const leaderboard = await ScoreSaberLeaderboardModel.findOne({
      songHash: hash,
      "difficulty.difficulty": difficulty,
      "difficulty.characteristic": characteristic,
    })
      .select("_id")
      .lean();

    if (leaderboard == null) {
      return;
    }

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

    /**
     * Whether there is another page after this one.
     *
     * @param currentPage the page that was just processed
     * @param scoresPage the page token
     */
    function hasMorePages(currentPage: number, scoresPage: BeatLeaderPlayerScoresPageToken): boolean {
      const { total, itemsPerPage } = scoresPage.metadata;
      const ipp = Math.max(1, itemsPerPage);
      return currentPage < Math.ceil(total / ipp);
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
          await PlayerBeatLeaderScoresService.linkScoreSaberScoreBeatLeaderId(
            scoreToken as BeatLeaderScoreToken
          );
        }
      }

      return { newTracked, fullPageAlreadyTracked: false };
    }

    let currentPage = 1;
    let exitedDueToApiFailure = false;

    while (true) {
      const scoresPage = await getScoresPage(currentPage);
      if (!scoresPage) {
        exitedDueToApiFailure = true;
        Logger.warn(
          `[BeatLeader Seed] Stopped fetching for player %s: BeatLeader API returned no page after %s attempt(s) (page %s)`,
          playerId,
          formatNumberWithCommas(MAX_LOOKUP_ATTEMPTS),
          formatNumberWithCommas(currentPage)
        );
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

    if (!player.seededBeatLeaderScores) {
      if (options.mode === "backfill") {
        if (!exitedDueToApiFailure) {
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
