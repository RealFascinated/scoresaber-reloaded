import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import LeaderboardScoresResponse from "@ssr/common/response/leaderboard-scores-response";
import { getScoreSaberScoreFromToken } from "@ssr/common/token-creators";
import { Metadata } from "@ssr/common/types/metadata";
import BeatLeaderService from "../beatleader.service";
import { LeaderboardService } from "../leaderboard/leaderboard.service";
import { ScoreService } from "./score.service";

export class LeaderboardScoresService {
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

    const leaderboardResponse = await LeaderboardService.getLeaderboard(leaderboardId);
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

      // Track missing scores
      if (!(await ScoreService.scoreExistsByScoreId(score.scoreId))) {
        await ScoreService.trackScoreSaberScore(
          { ...score },
          leaderboard,
          token.leaderboardPlayerInfo,
          true,
          false
        );
        // Logger.info(`Tracked missing score ${score.scoreId} for leaderboard ${leaderboardId}`);
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
