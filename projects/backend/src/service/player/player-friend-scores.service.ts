import { NotFoundError } from "@ssr/common/error/not-found-error";
import {
  ScoreSaberScore,
  ScoreSaberScoreModel,
} from "@ssr/common/model/score/impl/scoresaber-score";
import { Page, Pagination } from "@ssr/common/pagination";
import { PlayerScore } from "@ssr/common/score/player-score";
import { processInBatches } from "@ssr/common/utils/batch-utils";
import { scoreToObject } from "@ssr/common/utils/model-converters";
import { LeaderboardCoreService } from "../leaderboard/leaderboard-core.service";
import { ScoreCoreService } from "../score/score-core.service";

const ITEMS_PER_PAGE = 8;
const MAX_TOTAL_SCORES = 1000;

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

    // Use aggregation pipeline for better performance
    const friendScores = await ScoreSaberScoreModel.aggregate([
      {
        $match: {
          playerId: { $in: friendIds },
          leaderboardId: leaderboardId,
        },
      },
      {
        $sort: {
          timestamp: -1,
          score: -1,
        },
      },
    ]);

    if (!friendScores.length) {
      throw new NotFoundError(
        `No scores found for friends "${friendIds.join(",")}" in leaderboard "${leaderboardId}"`
      );
    }

    // Process scores in parallel with batching
    const scores: ScoreSaberScore[] = [];
    await processInBatches(friendScores, 10, async friendScore => {
      const processedScore = await ScoreCoreService.insertScoreData(
        scoreToObject(friendScore),
        leaderboard.leaderboard,
        {
          insertAdditionalData: true,
          insertPreviousScore: false,
          insertPlayerInfo: true,
          removeScoreWeightAndRank: true,
        }
      );
      scores.push(processedScore);
    });
    return new Pagination<ScoreSaberScore>()
      .setItems(scores.sort((a, b) => b.score - a.score))
      .setTotalItems(scores.length)
      .setItemsPerPage(8)
      .getPage(page);
  }

  /**
   * Gets friend scores for a leaderboard.
   *
   * @param friendIds the friend ids
   * @param leaderboardId the leaderboard id
   * @param page the page to fetch
   */
  public static async getFriendScores(
    friendIds: string[],
    page: number
  ): Promise<Page<PlayerScore>> {
    // Get total count for pagination
    const totalCount = Math.min(
      await ScoreSaberScoreModel.countDocuments({
        playerId: { $in: friendIds },
      }),
      MAX_TOTAL_SCORES
    );

    return new Pagination<PlayerScore>()
      .setTotalItems(totalCount)
      .setItemsPerPage(ITEMS_PER_PAGE)
      .getPageWithCursor(page, {
        sortField: "timestamp",
        sortDirection: -1,
        getCursor: (item: { timestamp: Date; _id: unknown }) => ({
          sortValue: item.timestamp,
          id: item._id,
        }),
        buildCursorQuery: cursor => {
          const baseMatch = { playerId: { $in: friendIds } };
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
          const previousPageSkip = (page - 2) * ITEMS_PER_PAGE;
          const items = await ScoreSaberScoreModel.aggregate([
            {
              $match: {
                playerId: { $in: friendIds },
              },
            },
            {
              $sort: {
                timestamp: -1,
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
                timestamp: 1,
                _id: 1,
              },
            },
          ]);
          return (items[0] as { timestamp: Date; _id: unknown }) || null;
        },
        fetchItems: async cursorInfo => {
          // Use aggregation pipeline for better performance
          const friendScores = await ScoreSaberScoreModel.aggregate([
            {
              $match: cursorInfo.query,
            },
            {
              $sort: {
                timestamp: -1,
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

          const leaderboardMap = await LeaderboardCoreService.batchFetchLeaderboards(
            friendScores,
            score => score.leaderboardId,
            { includeBeatSaver: true, beatSaverType: "full" }
          );

          // Process scores
          const scores = await Promise.all(
            friendScores.map(async friendScore => {
              const score = scoreToObject(friendScore);
              const leaderboardResponse = leaderboardMap.get(Number(friendScore.leaderboardId));
              if (!leaderboardResponse) {
                return null;
              }

              return {
                score: await ScoreCoreService.insertScoreData(
                  score,
                  leaderboardResponse.leaderboard,
                  {
                    insertPlayerInfo: true,
                    removeScoreWeightAndRank: true,
                  }
                ),
                leaderboard: leaderboardResponse.leaderboard,
                beatSaver: leaderboardResponse.beatsaver,
              };
            })
          );

          return scores.filter(Boolean) as PlayerScore[];
        },
      });
  }
}
