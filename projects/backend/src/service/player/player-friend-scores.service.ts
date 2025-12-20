import { NotFoundError } from "@ssr/common/error/not-found-error";
import {
  ScoreSaberScore,
  ScoreSaberScoreModel,
} from "@ssr/common/model/score/impl/scoresaber-score";
import { Page, Pagination } from "@ssr/common/pagination";
import { scoreToObject } from "@ssr/common/utils/model-converters";
import { LeaderboardCoreService } from "../leaderboard/leaderboard-core.service";
import { ScoreCoreService } from "../score/score-core.service";

export class PlayerFriendScoresService {
  /**
   * Gets friend scores for a leaderboard.
   *
   * @param friendIds the friend ids
   * @param leaderboardId the leaderboard id
   * @param page the page to fetch
   */
  public static async getFriendLeaderboardScores(
    friendIds: string[],
    leaderboardId: number,
    page: number
  ): Promise<Page<ScoreSaberScore>> {
    const leaderboard = await LeaderboardCoreService.getLeaderboard(leaderboardId, {
      includeBeatSaver: false,
    });

    const totalCount = await ScoreSaberScoreModel.countDocuments({
      playerId: { $in: friendIds },
      leaderboardId: leaderboardId,
    });

    if (totalCount === 0) {
      throw new NotFoundError(
        `No scores found for friends "${friendIds.join(",")}" in leaderboard "${leaderboardId}"`
      );
    }

    const pagination = new Pagination<ScoreSaberScore>()
      .setTotalItems(totalCount)
      .setItemsPerPage(8);

    return pagination.getPageWithCursor(page, {
      sortField: "score",
      sortDirection: -1,
      getCursor: (item: { score: number; _id: unknown }) => ({
        sortValue: item.score,
        id: item._id,
      }),
      buildCursorQuery: cursor => {
        const baseMatch = {
          playerId: { $in: friendIds },
          leaderboardId: leaderboardId,
        };
        if (!cursor) return baseMatch;
        return {
          ...baseMatch,
          $or: [
            { score: { $lt: cursor.sortValue } },
            { score: cursor.sortValue, _id: { $lt: cursor.id } },
          ],
        };
      },
      getPreviousPageItem: async () => {
        // Get the last item from the previous page
        const previousPageSkip = (page - 1) * pagination.itemsPerPage - 1;
        if (previousPageSkip < 0) return null;
        const items = await ScoreSaberScoreModel.aggregate([
          {
            $match: {
              playerId: { $in: friendIds },
              leaderboardId: leaderboardId,
            },
          },
          {
            $sort: {
              score: -1,
              _id: -1,
            },
          },
          {
            $skip: previousPageSkip,
          },
          {
            $limit: 1,
          },
          {
            $project: {
              score: 1,
              _id: 1,
            },
          },
        ]);
        return (items[0] as { score: number; _id: unknown }) || null;
      },
      fetchItems: async cursorInfo => {
        const friendScores = await ScoreSaberScoreModel.aggregate([
          {
            $match: cursorInfo.query,
          },
          {
            $sort: {
              score: -1,
              _id: -1,
            },
          },
          {
            $limit: cursorInfo.limit,
          },
        ]);

        if (!friendScores.length) {
          return [];
        }

        // Process scores in parallel
        const scores = await Promise.all(
          friendScores.map(async friendScore => {
            const processedScore = await ScoreCoreService.insertScoreData(
              scoreToObject(friendScore),
              leaderboard.leaderboard,
              {
                insertBeatLeaderScore: true,
                insertPreviousScore: false,
                insertPlayerInfo: true,
                removeScoreWeightAndRank: true,
              }
            );
            return processedScore;
          })
        );

        return scores;
      },
    });
  }
}
