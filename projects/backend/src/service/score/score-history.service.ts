import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberPreviousScoreModel } from "@ssr/common/model/score/impl/scoresaber-previous-score";
import {
  ScoreSaberScore,
  ScoreSaberScoreModel,
} from "@ssr/common/model/score/impl/scoresaber-score";
import { Page, Pagination } from "@ssr/common/pagination";
import { ScoreHistoryGraphResponse } from "@ssr/common/response/score-history-graph-response";
import { PlayerScore } from "@ssr/common/score/player-score";
import { NotFoundError } from "elysia";
import LeaderboardService from "../scoresaber/leaderboard.service";
import { ScoreService } from "./score.service";

export class ScoreHistoryService {
  /**
   * Gets the player's score history for a map.
   *
   * @param playerId the player's id to get the previous scores for
   * @param leaderboardId the leaderboard to get the previous scores on
   * @param page the page to get
   */
  public static async getScoreHistory(
    playerId: string,
    leaderboardId: string,
    page: number
  ): Promise<Page<PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>>> {
    const scores = await ScoreSaberPreviousScoreModel.find({
      playerId: playerId,
      leaderboardId: leaderboardId,
    }).sort({
      timestamp: -1,
    });
    if (scores == null || scores.length == 0) {
      throw new NotFoundError(`No previous scores found for ${playerId} in ${leaderboardId}`);
    }

    return new Pagination<PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>>()
      .setItemsPerPage(8)
      .setTotalItems(scores.length)
      .getPage(page, async () => {
        const toReturn: PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>[] = [];
        for (const scoreToken of scores) {
          let score = scoreToken.toObject() as unknown as ScoreSaberScore;

          const leaderboardResponse = await LeaderboardService.getLeaderboard(leaderboardId);
          if (leaderboardResponse == undefined) {
            throw new NotFoundError(`Leaderboard "${leaderboardId}" not found`);
          }
          const { leaderboard, beatsaver } = leaderboardResponse;

          score = await ScoreService.insertScoreData(score, leaderboard);
          toReturn.push({
            score: score,
            leaderboard: leaderboard,
            beatSaver: beatsaver,
          });
        }

        return toReturn;
      });
  }

  /**
   * Gets the score history graph for a player on a map.
   *
   * @param playerId the player's id to get the previous scores for
   * @param leaderboardId the leaderboard to get the previous scores on
   */
  public static async getScoreHistoryGraph(
    playerId: string,
    leaderboardId: string
  ): Promise<ScoreHistoryGraphResponse> {
    const { leaderboard } = await LeaderboardService.getLeaderboard(leaderboardId, {
      cacheOnly: true,
      includeBeatSaver: false,
    });

    const select = {
      score: 1,
      accuracy: 1,
      misses: 1,
      pp: 1,
      timestamp: 1,
    };

    const scores = await ScoreSaberScoreModel.find({
      playerId: playerId,
      leaderboardId: leaderboardId,
    })
      .select(select)
      .sort({
        timestamp: -1,
      })
      .lean();

    const previousScores = await ScoreSaberPreviousScoreModel.find({
      playerId: playerId,
      leaderboardId: leaderboardId,
    })
      .select(select)
      .sort({
        timestamp: -1,
      })
      .lean();

    return {
      isRanked: leaderboard.ranked,
      scores: [...scores, ...previousScores]
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        .map(score => ({
          score: score.score,
          accuracy: score.accuracy,
          misses: score.misses,
          pp: score.pp,
          timestamp: score.timestamp,
        })),
    };
  }
}
