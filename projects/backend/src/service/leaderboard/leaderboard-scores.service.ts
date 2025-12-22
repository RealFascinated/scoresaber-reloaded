import { NotFoundError } from "@ssr/common/error/not-found-error";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import LeaderboardScoresResponse from "@ssr/common/schemas/response/leaderboard/leaderboard-scores";
import { getScoreSaberScoreFromToken } from "@ssr/common/token-creators";
import BeatLeaderService from "../beatleader.service";
import { ScoreSaberApiService } from "../scoresaber-api.service";
import { LeaderboardCoreService } from "./leaderboard-core.service";

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
    leaderboardId: number,
    page: number,
    country?: string
  ): Promise<LeaderboardScoresResponse | undefined> {
    const leaderboardResponse = await LeaderboardCoreService.getLeaderboard(leaderboardId);
    if (leaderboardResponse == undefined) {
      throw new NotFoundError(`Leaderboard "${leaderboardId}" not found`);
    }
    const leaderboard = leaderboardResponse.leaderboard;
    const beatSaverMap = leaderboardResponse.beatsaver;

    const leaderboardScores = await ScoreSaberApiService.lookupLeaderboardScores(leaderboardId, page, {
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

      const beatLeaderScore = await BeatLeaderService.getBeatLeaderScoreFromSong(
        score.playerId,
        leaderboard.songHash,
        leaderboard.difficulty.difficulty,
        leaderboard.difficulty.characteristic,
        score.score
      );
      if (beatLeaderScore !== undefined) {
        score.beatLeaderScore = beatLeaderScore;
      }

      return score;
    });

    const totalPages = Math.ceil(leaderboardScores.metadata.total / leaderboardScores.metadata.itemsPerPage);

    return {
      scores: (await Promise.all(scorePromises)).filter(score => score !== undefined) as ScoreSaberScore[],
      leaderboard: leaderboard,
      beatSaver: beatSaverMap,
      metadata: {
        totalPages,
        totalItems: leaderboardScores.metadata.total,
        page: leaderboardScores.metadata.page,
        itemsPerPage: leaderboardScores.metadata.itemsPerPage,
      },
    };
  }
}
