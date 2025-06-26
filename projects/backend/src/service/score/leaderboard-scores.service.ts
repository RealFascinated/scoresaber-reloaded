import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { ScoreType } from "@ssr/common/model/score/score";
import LeaderboardScoresResponse from "@ssr/common/response/leaderboard-scores-response";
import { getScoreSaberScoreFromToken } from "@ssr/common/token-creators";
import { Metadata } from "@ssr/common/types/metadata";
import BeatLeaderService from "../beatleader.service";
import { LeaderboardService } from "../leaderboard/leaderboard.service";

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
  ): Promise<LeaderboardScoresResponse<unknown, unknown> | undefined> {
    const scores: ScoreType[] = [];
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
    if (leaderboardScores == undefined) {
      return;
    }

    // ensure player is tracked (ran async to avoid blocking)
    // for (const score of leaderboardScores.scores) {
    //   PlayerService.trackPlayer(score.leaderboardPlayerInfo.id);
    // }

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

    const processedScores = await Promise.all(scorePromises);
    scores.push(
      ...processedScores.filter((score): score is ScoreSaberScore => score !== undefined)
    );

    metadata = new Metadata(
      Math.ceil(leaderboardScores.metadata.total / leaderboardScores.metadata.itemsPerPage),
      leaderboardScores.metadata.total,
      leaderboardScores.metadata.page,
      leaderboardScores.metadata.itemsPerPage
    );

    return {
      scores: scores,
      leaderboard: leaderboard,
      beatSaver: beatSaverMap,
      metadata: metadata,
    };
  }
}
