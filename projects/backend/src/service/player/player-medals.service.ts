import { DetailType } from "@ssr/common/detail-type";
import Logger from "@ssr/common/logger";
import { MEDAL_COUNTS } from "@ssr/common/medal";
import { PlayerModel } from "@ssr/common/model/player/player";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { Page, Pagination } from "@ssr/common/pagination";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { LeaderboardService } from "../leaderboard/leaderboard.service";
import ScoreSaberService from "../scoresaber.service";

export class PlayerMedalsService {
  /**
   * Updates the medal count for a player.
   *
   * @param playerId the id of the player
   * @param rankedLeaderboards the ranked leaderboards
   */
  public static async updatePlayerMedalCounts(): Promise<void> {
    const before = performance.now();
    await PlayerMedalsService.updatePlayerGlobalMedalCounts();
    await PlayerMedalsService.updatePlayerMedalsRank();
    Logger.debug(
      `Updated medal counts for all players in ${formatDuration(performance.now() - before)}`
    );
  }

  /**
   * Updates the global medal count for all players.
   */
  public static async updatePlayerGlobalMedalCounts(): Promise<void> {
    const rankedLeaderboards = await LeaderboardService.getRankedLeaderboards({
      match: {
        seededScores: true,
      },
    });

    // Single aggregation that calculates everything in one go
    const results = await ScoreSaberScoreModel.aggregate([
      {
        $match: {
          leaderboardId: { $in: rankedLeaderboards.map(leaderboard => leaderboard.id) },
          rank: { $lte: 5 },
        },
      },

      // Sort by player, leaderboard, and rank to ensure best scores come first
      {
        $sort: {
          playerId: 1,
          leaderboardId: 1,
          rank: 1,
        },
      },

      // Group by player and leaderboard to get the best score (lowest rank) per leaderboard
      {
        $group: {
          _id: {
            playerId: "$playerId",
            leaderboardId: "$leaderboardId",
          },
          bestRank: { $first: "$rank" }, // Use $first since we sorted by rank ascending
        },
      },

      // Calculate medals using the original medal values
      {
        $addFields: {
          medals: {
            $switch: {
              branches: [
                { case: { $lte: ["$bestRank", 1] }, then: MEDAL_COUNTS[1] },
                { case: { $lte: ["$bestRank", 2] }, then: MEDAL_COUNTS[2] },
                { case: { $lte: ["$bestRank", 3] }, then: MEDAL_COUNTS[3] },
                { case: { $lte: ["$bestRank", 5] }, then: MEDAL_COUNTS[5] },
              ],
              default: 0,
            },
          },
        },
      },

      // Group by player to get total medals
      {
        $group: {
          _id: "$_id.playerId",
          totalMedals: { $sum: "$medals" },
        },
      },
    ]).hint({ leaderboardId: 1, rank: 1 });

    // Update all players in one operation
    await PlayerModel.bulkWrite([
      // Update players with medals
      ...results.map(result => ({
        updateOne: {
          filter: { _id: result._id },
          update: { $set: { medals: result.totalMedals } },
        },
      })),
      // Set all other players to 0 medals
      {
        updateMany: {
          filter: {
            _id: { $nin: results.map(r => r._id) },
            medals: { $ne: 0 },
          },
          update: { $set: { medals: 0 } },
        },
      },
    ]);
  }

  /**
   * Updates the medal rank for specific players.
   */
  public static async updatePlayerMedalsRankForPlayers(playerIds: string[]): Promise<void> {
    if (playerIds.length === 0) return;

    // Get all players with medals > 0, sorted by medals descending
    const allPlayers = await PlayerModel.find({
      medals: { $gt: 0 },
    })
      .select("_id medals")
      .sort({ medals: -1 })
      .lean();

    // Create a map of player ID to their new rank
    const rankMap = new Map<string, number>();
    for (let i = 0; i < allPlayers.length; i++) {
      rankMap.set(allPlayers[i]._id, i + 1);
    }

    // Prepare bulk operations for affected players - only update if rank changed
    const bulkOps = playerIds
      .filter(id => rankMap.has(id))
      .map(id => ({
        updateOne: {
          filter: { _id: id },
          update: { $set: { medalsRank: rankMap.get(id) } },
        },
      }));

    if (bulkOps.length > 0) {
      await PlayerModel.bulkWrite(bulkOps);
    }
  }

  /**
   * Updates the medal rank for all players.
   */
  public static async updatePlayerMedalsRank(): Promise<void> {
    // Get all players with medals > 0, sorted by medals descending
    const players = await PlayerModel.find({
      medals: { $gt: 0 },
    })
      .select("_id medals")
      .sort({ medals: -1 })
      .lean();

    if (players.length === 0) return;

    // Prepare bulk operations
    const bulkOps = players.map((player, index) => ({
      updateOne: {
        filter: { _id: player._id },
        update: { $set: { medalsRank: index + 1 } },
      },
    }));

    await PlayerModel.bulkWrite(bulkOps);

    // Set medalsRank to null for players with 0 medals (more efficient than individual updates)
    await PlayerModel.updateMany({ medals: { $lte: 0 } }, { $unset: { medalsRank: "" } });
  }

  /**
   * Gets the player medal ranking for a page.
   *
   * @param page the page number
   * @returns the players
   */
  public static async getPlayerMedalRanking(page: number): Promise<Page<ScoreSaberPlayer>> {
    const totalPlayers = await PlayerModel.countDocuments({
      medals: { $gt: 0 },
    });
    if (totalPlayers === 0) {
      return Pagination.empty<ScoreSaberPlayer>();
    }

    const pagination = new Pagination<ScoreSaberPlayer>()
      .setItemsPerPage(50)
      .setTotalItems(totalPlayers);

    return pagination.getPage(page, async ({ start }) => {
      const players = await PlayerModel.find({
        medals: { $gt: 0 },
      })
        .sort({ medalsRank: 1 })
        .skip(start)
        .limit(pagination.itemsPerPage);

      return await Promise.all(
        players.map(async player =>
          ScoreSaberService.getPlayer(
            player.id,
            DetailType.BASIC,
            await ScoreSaberService.getCachedPlayer(player.id, true)
          )
        )
      );
    });
  }
}
