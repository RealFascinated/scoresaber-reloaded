import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import Logger from "@ssr/common/logger";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import ScoreSaberScoreToken from "@ssr/common/types/token/scoresaber/score";

export class LeaderboardScoresService {
  /**
   * Gets the amount of tracked scores for a leaderboard
   */
  public static async getTrackedScoresCount(leaderboardId: number | string): Promise<number> {
    const id = Number(leaderboardId);
    if (isNaN(id)) {
      throw new Error(`Invalid leaderboardId: ${leaderboardId}`);
    }
    return ScoreSaberScoreModel.countDocuments({ leaderboardId: id });
  }

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
}
