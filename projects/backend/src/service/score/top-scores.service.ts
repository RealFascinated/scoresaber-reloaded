import {
  ScoreSaberScore,
  ScoreSaberScoreModel,
} from "@ssr/common/model/score/impl/scoresaber-score";
import type { Page } from "@ssr/common/pagination";
import { Pagination } from "@ssr/common/pagination";
import { PlayerScore } from "@ssr/common/score/player-score";
import ScoreSaberScoreToken from "@ssr/common/types/token/scoresaber/score";
import { scoreToObject } from "@ssr/common/utils/model-converters";
import { LeaderboardCoreService } from "../leaderboard/leaderboard-core.service";
import ScoreSaberService from "../scoresaber.service";
import { ScoreCoreService } from "./score-core.service";

export class TopScoresService {
  /**
   * Gets the top tracked scores.
   *
   * @param page the page number
   * @returns the top scores with pagination metadata
   */
  public static async getTopScores(page: number = 1): Promise<Page<PlayerScore>> {
    const pagination = new Pagination<PlayerScore>().setItemsPerPage(25).setTotalItems(1000);

    return pagination.getPageWithCursor(page, {
      sortField: "pp",
      sortDirection: -1,
      getCursor: (item: { pp: number; _id: unknown }) => ({
        sortValue: item.pp,
        id: item._id,
      }),
      buildCursorQuery: (cursor) => {
        if (!cursor) return { pp: { $gt: 0 } };
        return {
          pp: { $lt: cursor.sortValue, $gt: 0 },
        };
      },
      getPreviousPageItem: async () => {
        const skip = Math.min((page - 2) * 25, pagination.totalItems - pagination.itemsPerPage);
        if (skip < 0) return null;
        const items = await ScoreSaberScoreModel.aggregate([
          { $match: { pp: { $gt: 0 } } },
          { $sort: { pp: -1 } },
          { $skip: skip },
          { $limit: 1 },
          { $project: { pp: 1, _id: 1 } },
        ]).hint({ pp: -1 });
        return (items[0] as { pp: number; _id: unknown }) || null;
      },
      fetchItems: async (cursorInfo) => {
        const scoreObjects = (
          await ScoreSaberScoreModel.aggregate([
            { $match: cursorInfo.query },
            { $sort: { pp: -1 } },
            { $limit: cursorInfo.limit },
          ]).hint({ pp: -1 })
        ).map(scoreToObject);

        if (!scoreObjects.length) {
          return [];
        }

        const leaderboardMap = await LeaderboardCoreService.batchFetchLeaderboards(
          scoreObjects,
          (score: ScoreSaberScore) => score.leaderboardId,
          { includeBeatSaver: true }
        );

        // Batch fetch player info to check banned status
        const uniquePlayerIds = [
          ...new Set(scoreObjects.map((score: ScoreSaberScore) => score.playerId.toString())),
        ] as string[];
        const playerPromises = uniquePlayerIds.map(playerId =>
          ScoreSaberService.getCachedPlayer(playerId).catch(() => undefined)
        );
        const players = await Promise.all(playerPromises);
        const playerMap = new Map(
          players.filter((p): p is NonNullable<typeof p> => p !== undefined).map(p => [p.id, p])
        );

        // Process scores in parallel
        const processedScores = await Promise.all(
          scoreObjects.map(async (score: ScoreSaberScore) => {
            const player = playerMap.get(score.playerId.toString());

            // Skip scores from banned players
            if (player?.banned) {
              return null;
            }
          const leaderboardResponse = leaderboardMap.get(score.leaderboardId);
          if (!leaderboardResponse) {
            return null;
          }

          const { leaderboard, beatsaver } = leaderboardResponse;

          const processedScore = await ScoreCoreService.insertScoreData(score, leaderboard, {
            removeScoreWeightAndRank: true,
            insertPlayerInfo: true,
          });
          return {
            score: processedScore,
            leaderboard: leaderboard,
            beatSaver: beatsaver,
          } as PlayerScore;
          })
        );

        return processedScores.filter(Boolean) as PlayerScore[];
      },
    });
  }

  /**
   * Checks if a score is in the top 50 global scores.
   *
   * @param score the score to check
   * @returns whether the score is in the top 50 global scores
   */
  public static async isTop50GlobalScore(score: ScoreSaberScore | ScoreSaberScoreToken) {
    // Only check top 50 if score is in top 10 and has positive PP
    if (score.pp <= 0 || score.rank >= 10) {
      return false;
    }

    // Get the 50th highest PP score directly from the database
    const top50Scores = await ScoreSaberScoreModel.aggregate([
      { $match: { pp: { $gt: 0 } } },
      { $sort: { pp: -1 } },
      { $limit: 50 },
      { $group: { _id: null, minPp: { $min: "$pp" } } },
    ]);

    const lowestPp = top50Scores[0]?.minPp ?? Infinity;
    return score.pp >= lowestPp;
  }
}
