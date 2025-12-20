import { NotFoundError } from "@ssr/common/error/not-found-error";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberPreviousScoreModel } from "@ssr/common/model/score/impl/scoresaber-previous-score";
import {
  ScoreSaberPreviousScoreOverview,
  ScoreSaberScore,
  ScoreSaberScoreModel,
} from "@ssr/common/model/score/impl/scoresaber-score";
import type { Page } from "@ssr/common/pagination";
import { Pagination } from "@ssr/common/pagination";
import { normalizeModifiers } from "@ssr/common/score/modifier";
import { scoreToObject } from "@ssr/common/utils/model-converters";
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
    // Get leaderboard data once for all scores
    const leaderboardResponse = await LeaderboardCoreService.getLeaderboard(leaderboardId);
    if (leaderboardResponse == undefined) {
      throw new NotFoundError(`Leaderboard "${leaderboardId}" not found`);
    }
    const { leaderboard } = leaderboardResponse;

    // Get total count using aggregation
    const totalCountResult = await ScoreSaberScoreModel.aggregate([
      {
        $match: {
          playerId: playerId,
          leaderboardId: leaderboardId,
        },
      },
      {
        $unionWith: {
          coll: "scoresaber-previous-scores",
          pipeline: [
            {
              $match: {
                playerId: playerId,
                leaderboardId: leaderboardId,
              },
            },
          ],
        },
      },
      {
        $count: "total",
      },
    ]);

    const totalScores = totalCountResult[0]?.total ?? 0;
    if (totalScores === 0) {
      throw new NotFoundError(`No previous scores found for ${playerId} in ${leaderboardId}`);
    }

    const pagination = new Pagination<ScoreSaberScore>()
      .setItemsPerPage(8)
      .setTotalItems(totalScores);

    return pagination.getPageWithCursor(page, {
      sortField: "timestamp",
      sortDirection: -1,
      getCursor: (item: { timestamp: Date; _id: unknown }) => ({
        sortValue: item.timestamp,
        id: item._id,
      }),
      buildCursorQuery: cursor => {
        const baseMatch = {
          playerId: playerId,
          leaderboardId: leaderboardId,
        };
        if (!cursor) return baseMatch;
        return {
          ...baseMatch,
          $or: [
            { timestamp: { $lt: cursor.sortValue } },
            { timestamp: cursor.sortValue, _id: { $lt: cursor.id } },
          ],
        };
      },
      getPreviousPageItem: async () => {
        // Get the last item from the previous page
        // For page 2, we want item at position 7 (last item of page 1)
        // For page 3, we want item at position 15 (last item of page 2)
        const previousPageStart = (page - 1) * 8 - 1;
        if (previousPageStart < 0) return null;

        const items = await ScoreSaberScoreModel.aggregate([
          {
            $match: {
              playerId: playerId,
              leaderboardId: leaderboardId,
            },
          },
          {
            $unionWith: {
              coll: "scoresaber-previous-scores",
              pipeline: [
                {
                  $match: {
                    playerId: playerId,
                    leaderboardId: leaderboardId,
                  },
                },
              ],
            },
          },
          {
            $sort: {
              timestamp: -1,
              _id: -1,
            },
          },
          {
            $skip: previousPageStart,
          },
          {
            $limit: 1,
          },
          {
            $project: {
              timestamp: 1,
              _id: 1,
            },
          },
        ]).hint({ playerId: 1, timestamp: -1, _id: -1 });

        return (items[0] as { timestamp: Date; _id: unknown }) || null;
      },
      fetchItems: async cursorInfo => {
        // Build base pipeline
        const baseStages = [
          {
            $match: {
              playerId: playerId,
              leaderboardId: leaderboardId,
            },
          },
          {
            $unionWith: {
              coll: "scoresaber-previous-scores",
              pipeline: [
                {
                  $match: {
                    playerId: playerId,
                    leaderboardId: leaderboardId,
                  },
                },
              ],
            },
          },
        ];

        // Build cursor match stage if needed
        const cursorMatchStage = cursorInfo.cursor
          ? [
              {
                $match: {
                  $or: [
                    { timestamp: { $lt: cursorInfo.cursor.sortValue } },
                    { timestamp: cursorInfo.cursor.sortValue, _id: { $lt: cursorInfo.cursor.id } },
                  ],
                },
              },
            ]
          : [];

        // Build final stages
        const finalStages = [
          {
            $sort: {
              timestamp: -1 as const,
              _id: -1 as const,
            },
          },
          {
            $limit: cursorInfo.limit,
          },
        ];

        // Combine all stages
        const pipeline = [...baseStages, ...cursorMatchStage, ...finalStages];

        const rawScores = await ScoreSaberScoreModel.aggregate(pipeline);

        return await Promise.all(
          rawScores.map(async scoreToken => {
            let score = scoreToObject(scoreToken as unknown as ScoreSaberScore) as ScoreSaberScore;
            score = await ScoreCoreService.insertScoreData(score, leaderboard, {
              insertPreviousScore: false,
              removeScoreWeightAndRank: true,
            });
            score.isPreviousScore = true;
            return score;
          })
        );
      },
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
          modifiers: normalizeModifiers(previousScore.modifiers),
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
