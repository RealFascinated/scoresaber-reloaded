import { NotFoundError } from "@ssr/common/error/not-found-error";
import LeaderboardScoresResponse from "@ssr/common/schemas/response/leaderboard/leaderboard-scores";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { getScoreSaberScoreFromToken } from "@ssr/common/token-creators";
import BeatSaverService from "../beatsaver.service";
import { ScoreCoreService } from "../score/score-core.service";
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
    const leaderboard = await LeaderboardCoreService.getLeaderboard(leaderboardId);
    if (leaderboard == undefined) {
      throw new NotFoundError(`Leaderboard "${leaderboardId}" not found`);
    }

    const leaderboardScores = await ScoreSaberApiService.lookupLeaderboardScores(leaderboardId, page, {
      country: country,
    });
    if (!leaderboardScores) {
      throw new NotFoundError(`Leaderboard scores for leaderboard "${leaderboardId}" not found`);
    }

    const parsedScores = leaderboardScores.scores.map(token =>
      getScoreSaberScoreFromToken(token, leaderboard, token.leaderboardPlayerInfo.id)
    );

    const scores = (
      await Promise.all(
        parsedScores.map(score => {
          if (score === undefined) {
            return undefined;
          }
          return ScoreCoreService.insertScoreData(score, leaderboard, {
            insertBeatLeaderScore: true,
          });
        })
      )
    ).filter(score => score !== undefined) as ScoreSaberScore[];

    const totalPages = Math.ceil(leaderboardScores.metadata.total / leaderboardScores.metadata.itemsPerPage);

    return {
      scores,
      leaderboard: leaderboard,
      beatSaver: await BeatSaverService.getMap(
        leaderboard.songHash,
        leaderboard.difficulty.difficulty,
        leaderboard.difficulty.characteristic
      ),
      metadata: {
        totalPages,
        totalItems: leaderboardScores.metadata.total,
        page: leaderboardScores.metadata.page,
        itemsPerPage: leaderboardScores.metadata.itemsPerPage,
      },
    };
  }
}
