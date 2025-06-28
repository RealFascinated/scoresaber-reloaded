import { DetailType } from "@ssr/common/detail-type";
import Logger from "@ssr/common/logger";
import { PlayerModel } from "@ssr/common/model/player/player";
import { ScoreSaberMedalsScoreModel } from "@ssr/common/model/score/impl/scoresaber-medals-score";
import { Pagination } from "@ssr/common/pagination";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerMedalRankingsResponse } from "@ssr/common/response/player-medal-rankings-response";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { FilterQuery } from "mongoose";
import ScoreSaberService from "../scoresaber.service";

export class PlayerMedalsService {
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
   * @param country optional country filter
   * @returns the players
   */
  public static async getPlayerMedalRanking(
    page: number,
    country?: string
  ): Promise<PlayerMedalRankingsResponse> {
    const filter: FilterQuery<typeof PlayerModel> = {
      medals: { $gt: 0 },
      country: { $nin: [null, "", undefined] },
      ...(country && { country: { $nin: [null, "", undefined], $in: [country] } }),
    };

    const totalPlayers = await PlayerModel.countDocuments(filter);
    if (totalPlayers === 0) {
      return {
        ...Pagination.empty<ScoreSaberPlayer>(),
        countryMetadata: {},
      } as PlayerMedalRankingsResponse;
    }

    const pagination = new Pagination<ScoreSaberPlayer>()
      .setItemsPerPage(50)
      .setTotalItems(totalPlayers);

    // Run player processing and country metadata aggregation in parallel
    const [pageData, countryMetadata] = await Promise.all([
      pagination.getPage(page, async ({ start }) => {
        // Use aggregation to get players sorted by medal count
        const players = await PlayerModel.aggregate([
          { $match: filter },
          // Sort by medals descending, then by _id ascending for consistent tiebreaking
          { $sort: { medals: -1, _id: 1 } },
          { $skip: start },
          { $limit: pagination.itemsPerPage },
        ]);

        if (players.length === 0) {
          return [];
        }

        // Process players sequentially to avoid race conditions
        const result: ScoreSaberPlayer[] = [];
        for (let i = 0; i < players.length; i++) {
          const player = players[i];
          const playerId = player._id.toString();

          const playerData = await ScoreSaberService.getPlayer(
            playerId,
            DetailType.BASIC,
            await ScoreSaberService.getCachedPlayer(playerId, true)
          );

          // Calculate country rank
          const isValidCountry = player.country && player.country.trim().length > 0;
          if (isValidCountry) {
            const countryRank = await PlayerModel.countDocuments({
              country: player.country,
              medals: { $gt: 0 },
              $or: [
                { medals: { $gt: player.medals ?? 0 } },
                { $and: [{ medals: player.medals ?? 0 }, { _id: { $lt: player._id } }] },
              ],
            });
            playerData.countryMedalsRank = countryRank + 1;
          } else {
            playerData.countryMedalsRank = 0;
          }

          // Calculate global rank only when filtering by country
          if (country) {
            const globalRank = await PlayerModel.countDocuments({
              medals: { $gt: 0 },
              $or: [
                { medals: { $gt: player.medals ?? 0 } },
                { $and: [{ medals: player.medals ?? 0 }, { _id: { $lt: player._id } }] },
              ],
            });
            playerData.medalsRank = globalRank + 1;
          } else {
            // Use position in results for global mode
            playerData.medalsRank = start + i + 1;
          }

          result.push(playerData);
        }

        return result;
      }),
      // Country metadata aggregation
      PlayerModel.aggregate([
        { $match: { ...filter, country: { $nin: [null, "", undefined] } } },
        { $group: { _id: "$country", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    return {
      ...pageData.toJSON(),
      countryMetadata: countryMetadata.reduce(
        (acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        },
        {} as Record<string, number>
      ),
    } as PlayerMedalRankingsResponse;
  }

  /**
   * Gets a player's medal rank on-demand without storing it in the database.
   *
   * @param playerId the id of the player
   * @returns the rank
   */
  public static async getPlayerMedalRank(playerId: string): Promise<number | null> {
    const player = await PlayerModel.findById(playerId).select("medals").lean();
    if (!player || (player.medals ?? 0) <= 0) return null;

    // Count how many players have more medals than this player
    const rank = await PlayerModel.countDocuments({
      medals: { $gt: player.medals ?? 0 },
    });

    return rank + 1; // +1 because rank is 1-indexed
  }

  /**
   * Gets a player's country medal rank on-demand.
   *
   * @param playerId the id of the player
   * @returns the rank
   */
  public static async getPlayerCountryMedalRank(playerId: string): Promise<number | null> {
    const player = await PlayerModel.findById(playerId).select("medals country").lean();
    if (!player || (player.medals ?? 0) <= 0 || !player.country) return null;

    // Count how many players from the same country have more medals
    const rank = await PlayerModel.countDocuments({
      medals: { $gt: player.medals ?? 0 },
      country: player.country,
    });

    return rank + 1; // +1 because rank is 1-indexed
  }
}
