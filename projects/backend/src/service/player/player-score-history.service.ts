import { NotFoundError } from "@ssr/common/error/not-found-error";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberPreviousScoreModel } from "@ssr/common/model/score/impl/scoresaber-previous-score";
import {
  ScoreSaberPreviousScoreOverview,
  ScoreSaberScore,
  ScoreSaberScoreModel,
} from "@ssr/common/model/score/impl/scoresaber-score";
import { Page, Pagination } from "@ssr/common/pagination";
import { ScoreHistoryGraphResponse } from "@ssr/common/response/score-history-graph-response";
import { PlayerScore } from "@ssr/common/score/player-score";
import { LeaderboardService } from "../leaderboard/leaderboard.service";
import { ScoreService } from "../score/score.service";

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
        // Get leaderboard data once for all scores
        const leaderboardResponse = await LeaderboardService.getLeaderboard(leaderboardId);
        if (leaderboardResponse == undefined) {
          throw new NotFoundError(`Leaderboard "${leaderboardId}" not found`);
        }
        const { leaderboard, beatsaver } = leaderboardResponse;

        // Process all scores in parallel
        const toReturn = await Promise.all(
          scores.map(async scoreToken => {
            let score = scoreToken.toObject() as unknown as ScoreSaberScore;
            score = await ScoreService.insertScoreData(score, leaderboard);
            return {
              score: score,
              leaderboard: leaderboard,
              beatSaver: beatsaver,
            };
          })
        );

        return toReturn;
      });
  }

  /**
   * Gets the score history graph for a player on a map.
   *
   * @param playerId the player's id to get the previous scores for
   * @param leaderboardId the leaderboard to get the previous scores on
   */
  public static async getPlayerScoreHistoryGraph(
    playerId: string,
    leaderboardId: string
  ): Promise<ScoreHistoryGraphResponse> {
    // Run leaderboard fetch and score queries in parallel
    const [leaderboardResponse, scores, previousScores] = await Promise.all([
      LeaderboardService.getLeaderboard(leaderboardId, {
        cacheOnly: true,
        includeBeatSaver: false,
      }),
      ScoreSaberScoreModel.find({
        playerId: playerId,
        leaderboardId: leaderboardId,
      })
        .select({
          score: 1,
          accuracy: 1,
          misses: 1,
          pp: 1,
          timestamp: 1,
        })
        .sort({
          timestamp: -1,
        })
        .lean(),
      ScoreSaberPreviousScoreModel.find({
        playerId: playerId,
        leaderboardId: leaderboardId,
      })
        .select({
          score: 1,
          accuracy: 1,
          misses: 1,
          pp: 1,
          timestamp: 1,
        })
        .sort({
          timestamp: -1,
        })
        .lean(),
    ]);

    const { leaderboard } = leaderboardResponse;

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
    const previousScore = await ScoreSaberPreviousScoreModel.findOne({
      playerId: playerId,
      leaderboardId: leaderboard.id,
      timestamp: { $lt: timestamp },
    })
      .sort({ timestamp: -1 })
      .lean();

    if (!previousScore) {
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
}
