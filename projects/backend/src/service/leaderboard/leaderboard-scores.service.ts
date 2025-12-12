import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger from "@ssr/common/logger";
import LeaderboardScoresResponse from "@ssr/common/response/leaderboard-scores-response";
import { getScoreSaberScoreFromToken } from "@ssr/common/token-creators";
import { Metadata } from "@ssr/common/types/metadata";
import ScoreSaberScoreToken from "@ssr/common/types/token/scoresaber/score";
import BeatLeaderService from "../beatleader.service";
import { LeaderboardCoreService } from "./leaderboard-core.service";

export class LeaderboardScoresService {
  /**
   * Fetches all scores for a specific leaderboard
   */
  public static async fetchAllLeaderboardScores(
    leaderboardId: string
  ): Promise<ScoreSaberScoreToken[]> {
    const scoreTokens: ScoreSaberScoreToken[] = [];
    let currentPage = 1;
    let hasMoreScores = true;

    while (hasMoreScores) {
      const response = await ApiServiceRegistry.getInstance()
        .getScoreSaberService()
        .lookupLeaderboardScores(leaderboardId + "", currentPage);
      if (!response) {
        Logger.warn(
          `Failed to fetch scoresaber api scores for leaderboard "${leaderboardId}" on page ${currentPage}`
        );
        currentPage++;
        continue;
      }
      const totalPages = Math.ceil(response.metadata.total / response.metadata.itemsPerPage);
      Logger.info(
        `Fetched scores for leaderboard "${leaderboardId}" on page ${currentPage}/${totalPages}`
      );

      scoreTokens.push(...response.scores);
      hasMoreScores = currentPage < totalPages;
      currentPage++;
    }

    return scoreTokens;
  }

  /**
   * Gets scores for a leaderboard.
   *
   * @param leaderboardId the leaderboard id
   * @param page the page to get
   * @param country the country to get scores in
   * @returns the scores
   */
  public static async getLeaderboardScores(
    leaderboardId: string,
    page: number,
    country?: string
  ): Promise<LeaderboardScoresResponse | undefined> {
    let metadata: Metadata = new Metadata(0, 0, 0, 0); // Default values

    const leaderboardResponse = await LeaderboardCoreService.getLeaderboard(leaderboardId);
    if (leaderboardResponse == undefined) {
      throw new NotFoundError(`Leaderboard "${leaderboardId}" not found`);
    }
    const leaderboard = leaderboardResponse.leaderboard;
    const beatSaverMap = leaderboardResponse.beatsaver;

    const leaderboardScores = await ApiServiceRegistry.getInstance()
      .getScoreSaberService()
      .lookupLeaderboardScores(leaderboardId, page, {
        country: country,
      });
    if (!leaderboardScores) {
      throw new NotFoundError(`Leaderboard scores for leaderboard "${leaderboardId}" not found`);
    }

    // Process scores in parallel
    const scorePromises = leaderboardScores.scores.map(async token => {
      const score = getScoreSaberScoreFromToken(
        token,
        leaderboardResponse.leaderboard,
        token.leaderboardPlayerInfo.id
      );
      if (score == undefined) {
        return undefined;
      }

      const additionalData = await BeatLeaderService.getAdditionalScoreDataFromSong(
        score.playerId,
        leaderboard.songHash,
        leaderboard.difficulty.difficulty,
        leaderboard.difficulty.characteristic,
        score.score
      );
      if (additionalData !== undefined) {
        score.additionalData = additionalData;
      }

      return score;
    });

    metadata = new Metadata(
      Math.ceil(leaderboardScores.metadata.total / leaderboardScores.metadata.itemsPerPage),
      leaderboardScores.metadata.total,
      leaderboardScores.metadata.page,
      leaderboardScores.metadata.itemsPerPage
    );

    return {
      scores: await Promise.all(scorePromises),
      leaderboard: leaderboard,
      beatSaver: beatSaverMap,
      metadata: metadata,
    };
  }
}
