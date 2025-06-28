import { DetailType } from "@ssr/common/detail-type";
import Logger from "@ssr/common/logger";
import { PlayerModel } from "@ssr/common/model/player/player";
import { ScoreSaberMedalsScoreModel } from "@ssr/common/model/score/impl/scoresaber-medals-score";
import { Page, Pagination } from "@ssr/common/pagination";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { formatDuration } from "@ssr/common/utils/time-utils";
import ScoreSaberService from "../scoresaber.service";

export class PlayerMedalsService {
  /**
   * Updates the medal count for a player.
   *
   * @param playerId the id of the player
   * @param rankedLeaderboards the ranked leaderboards
   * @param callback the callback to call after each page is processed
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
    const before = performance.now();

    const medalCounts = await ScoreSaberMedalsScoreModel.aggregate([
      {
        $group: {
          _id: "$playerId",
          totalMedals: { $sum: "$medals" },
        },
      },
      {
        $project: {
          _id: 0,
          playerId: "$_id",
          totalMedals: 1,
        },
      },
    ]);

    const playerMedalCounts = new Map<string, number>();
    for (const result of medalCounts) {
      playerMedalCounts.set(result.playerId, result.totalMedals);
    }

    const bulkOps = [];

    const playersWithMedals = await PlayerModel.find({
      medals: { $gt: 0 },
    })
      .select("_id")
      .lean();

    const playersWithMedalsSet = new Set(playersWithMedals.map(p => p._id.toString()));

    for (const playerId of playersWithMedalsSet) {
      if (!playerMedalCounts.has(playerId)) {
        bulkOps.push({
          updateOne: {
            filter: { _id: playerId },
            update: { $set: { medals: 0 } },
          },
        });
      }
    }

    for (const [playerId, medalCount] of playerMedalCounts) {
      bulkOps.push({
        updateOne: {
          filter: { _id: playerId },
          update: { $set: { medals: medalCount } },
        },
      });
    }

    if (bulkOps.length > 0) {
      await PlayerModel.bulkWrite(bulkOps);
    }

    Logger.debug(
      `[PLAYER MEDALS] Updated ${bulkOps.length} player medal counts in ${formatDuration(performance.now() - before)}`
    );
  }

  /**
   * Updates the medal rank for all players.
   */
  public static async updatePlayerMedalsRank(): Promise<void> {
    const before = performance.now();

    const rankedPlayers = await PlayerModel.aggregate([
      {
        $match: { medals: { $gt: 0 } },
      },
      {
        $sort: { medals: -1 },
      },
      {
        $project: {
          _id: 1,
          medals: 1,
        },
      },
    ]);

    if (rankedPlayers.length === 0) return;

    const rankBulkOps = rankedPlayers.map((player, index) => ({
      updateOne: {
        filter: { _id: player._id },
        update: { $set: { medalsRank: index + 1 } },
      },
    }));

    await PlayerModel.bulkWrite(rankBulkOps);

    await PlayerModel.updateMany({ medals: { $lte: 0 } }, { $unset: { medalsRank: "" } });

    Logger.debug(
      `[PLAYER MEDALS] Updated ranks for ${rankedPlayers.length} players in ${formatDuration(performance.now() - before)}`
    );
  }

  /**
   * Gets the amount of medals a player has.
   */
  public static async getPlayerMedals(playerId: string): Promise<number> {
    const player = await PlayerModel.findById(playerId).select("medals").lean();
    return player?.medals ?? 0;
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
      const players = await PlayerModel.aggregate([
        {
          $match: { medals: { $gt: 0 } },
        },
        {
          $sort: { medalsRank: 1 },
        },
        {
          $skip: start,
        },
        {
          $limit: pagination.itemsPerPage,
        },
        {
          $project: {
            _id: 1,
          },
        },
      ]);

      const playerIds = players.map(p => p._id.toString());
      const cachedPlayers = new Map<string, ScoreSaberPlayerToken>();

      const cachePromises = playerIds.map(async playerId => {
        const cached = await ScoreSaberService.getCachedPlayer(playerId, true);
        return { playerId, cached };
      });

      const cacheResults = await Promise.all(cachePromises);
      for (const { playerId, cached } of cacheResults) {
        cachedPlayers.set(playerId, cached);
      }

      return await Promise.all(
        players.map(async player =>
          ScoreSaberService.getPlayer(
            player._id.toString(),
            DetailType.BASIC,
            cachedPlayers.get(player._id.toString())
          )
        )
      );
    });
  }
}
