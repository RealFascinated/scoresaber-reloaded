import { NotFoundError } from "@ssr/common/error/not-found-error";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberPreviousScoreModel } from "@ssr/common/model/score/impl/scoresaber-previous-score";
import {
  ScoreSaberPreviousScoreOverview,
  ScoreSaberScore,
  ScoreSaberScoreModel,
} from "@ssr/common/model/score/impl/scoresaber-score";
import { Page, Pagination } from "@ssr/common/pagination";
import CacheService, { CacheId } from "../cache.service";
import { LeaderboardCoreService } from "../leaderboard/leaderboard-core.service";
import { ScoreCoreService } from "../score/score-core.service";

export class PlayerScoreHistoryService {
  /**
   * Gets the player's score history for a map.
   *
   * @param playerId the player's id to get the previous scores for
   * @param leaderboardId the leaderboard to get the previous scores on
   * @param page the page to get
   */
  public static async getPlayerScoreHistory(
    playerId: string,
    leaderboardId: number,
    page: number
  ): Promise<Page<ScoreSaberScore>> {
    const [scoreHistory, currentScores] = await Promise.all([
      ScoreSaberPreviousScoreModel.find({
        playerId: playerId,
        leaderboardId: leaderboardId,
      }),
      ScoreSaberScoreModel.find({
        playerId: playerId,
        leaderboardId: leaderboardId,
      }),
    ]);
    const scores = [...scoreHistory, ...currentScores].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
    if (scores == null || scores.length == 0) {
      throw new NotFoundError(`No previous scores found for ${playerId} in ${leaderboardId}`);
    }

    // Get leaderboard data once for all scores
    const leaderboardResponse = await LeaderboardCoreService.getLeaderboard(leaderboardId);
    if (leaderboardResponse == undefined) {
      throw new NotFoundError(`Leaderboard "${leaderboardId}" not found`);
    }
    const { leaderboard } = leaderboardResponse;

    return new Pagination<ScoreSaberScore>()
      .setItemsPerPage(8)
      .setTotalItems(scores.length)
      .getPage(page, async () => {
        return await Promise.all(
          scores.map(async scoreToken => {
            let score = scoreToken.toObject() as unknown as ScoreSaberScore;
            score = await ScoreCoreService.insertScoreData(score, leaderboard, {
              insertPreviousScore: false,
              removeScoreWeightAndRank: true,
            });
            score.isPreviousScore = true;
            return score;
          })
        );
      });
  }

  /**
   * Gets the player's previous score for a map.
   *
   * @param playerId the player's id to get the previous score for
   * @param score the score to get the previous score for
   * @param leaderboard the leaderboard to get the previous score on
   * @param timestamp the score's timestamp to get the previous score for
   * @returns the score, or undefined if none
   */
  public static async getPlayerPreviousScore(
    playerId: string,
    score: ScoreSaberScore,
    leaderboard: ScoreSaberLeaderboard,
    timestamp: Date
  ): Promise<ScoreSaberPreviousScoreOverview | undefined> {
    return CacheService.fetchWithCache(
      CacheId.PreviousScore,
      `previous-score:${playerId}-${score.scoreId}`,
      async () => {
        const previousScore = await ScoreSaberPreviousScoreModel.findOne({
          playerId: playerId,
          leaderboardId: leaderboard.id,
          timestamp: { $lt: timestamp },
        })
          .sort({ timestamp: -1 })
          .lean();

        if (!previousScore || previousScore.scoreId === score.scoreId) {
          return undefined;
        }

        return {
          score: previousScore.score,
          accuracy: previousScore.accuracy || (score.score / leaderboard.maxScore) * 100,
          modifiers: previousScore.modifiers,
          misses: previousScore.misses,
          missedNotes: previousScore.missedNotes,
          badCuts: previousScore.badCuts,
          fullCombo: previousScore.fullCombo,
          pp: previousScore.pp,
          weight: previousScore.weight,
          maxCombo: previousScore.maxCombo,
          timestamp: previousScore.timestamp,
          change: {
            score: score.score - previousScore.score,
            accuracy:
              (score.accuracy || (score.score / leaderboard.maxScore) * 100) -
              (previousScore.accuracy || (previousScore.score / leaderboard.maxScore) * 100),
            misses: score.misses - previousScore.misses,
            missedNotes: score.missedNotes - previousScore.missedNotes,
            badCuts: score.badCuts - previousScore.badCuts,
            pp: score.pp - previousScore.pp,
            weight: score.weight && previousScore.weight && score.weight - previousScore.weight,
            maxCombo: score.maxCombo - previousScore.maxCombo,
          },
        } as ScoreSaberPreviousScoreOverview;
      }
    );
  }
}
