import Logger from "@ssr/common/logger";
import { PlayerModel } from "@ssr/common/model/player/player";
import { ScoreSaberMedalsScoreModel } from "@ssr/common/model/score/impl/scoresaber-medals-score";
import { Pagination } from "@ssr/common/pagination";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerMedalRankingsResponse } from "@ssr/common/schemas/response/ranking/medal-rankings";
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

    Logger.info(
      `[PLAYER MEDALS] Updated ${bulkOps.length} player medal counts in ${formatDuration(performance.now() - before)}`
    );
  }

  /**
   * Updates the medal count for a list of players.
   *
   * @param playerIds the ids of the players
   */
  public static async updatePlayerMedalCounts(...playerIds: string[]): Promise<void> {
    const before = performance.now();
    const medalCounts = await ScoreSaberMedalsScoreModel.aggregate([
      {
        $match: {
          playerId: { $in: playerIds },
        },
      },
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

    for (const result of medalCounts) {
      await PlayerModel.updateOne({ _id: result.playerId }, { $set: { medals: result.totalMedals } });
    }

    Logger.info(
      `[PLAYER MEDALS] Updated ${medalCounts.length} player medal counts in ${formatDuration(performance.now() - before)}`
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
  public static async getPlayerMedalRanking(page: number, country?: string): Promise<PlayerMedalRankingsResponse> {
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

    const pagination = new Pagination<ScoreSaberPlayer>().setItemsPerPage(50).setTotalItems(totalPlayers);

    const [pageData, countryMetadata] = await Promise.all([
      pagination.getPage(page, async ({ start }) => {
        // Get players sorted by medal count
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

        const [globalRankings, countryRankings] = await Promise.all([
          // Global rankings for current page players
          PlayerModel.aggregate([
            { $match: { medals: { $gt: 0 } } },
            { $sort: { medals: -1, _id: 1 } },
            { $group: { _id: null, players: { $push: { id: "$_id", medals: "$medals" } } } },
            { $unwind: { path: "$players", includeArrayIndex: "rank" } },
            { $match: { "players.id": { $in: players.map(p => p._id) } } },
            { $project: { playerId: "$players.id", globalRank: { $add: ["$rank", 1] } } },
          ]),
          // Country rankings for current page players
          PlayerModel.aggregate([
            {
              $match: {
                medals: { $gt: 0 },
                country: { $in: [...new Set(players.map(p => p.country).filter(Boolean))] },
              },
            },
            { $sort: { country: 1, medals: -1, _id: 1 } },
            { $group: { _id: "$country", players: { $push: { id: "$_id", medals: "$medals" } } } },
            { $unwind: { path: "$players", includeArrayIndex: "rank" } },
            { $match: { "players.id": { $in: players.map(p => p._id) } } },
            {
              $project: {
                playerId: "$players.id",
                country: "$_id",
                countryRank: { $add: ["$rank", 1] },
              },
            },
          ]),
        ]);

        // Create lookup maps
        const globalRankMap = new Map(globalRankings.map(r => [r.playerId.toString(), r.globalRank]));
        const countryRankMap = new Map(countryRankings.map(r => [r.playerId.toString(), r.countryRank]));

        const result = await Promise.all(
          players.map(async player => {
            const playerId = player._id.toString();

            const playerData = await ScoreSaberService.getPlayer(
              playerId,
              "basic",
              await ScoreSaberService.getCachedPlayer(playerId),
              { setMedalsRank: false, setInactivesRank: false }
            );

            // Use pre-calculated rankings
            playerData.medalsRank = globalRankMap.get(playerId) ?? 0;
            playerData.countryMedalsRank = countryRankMap.get(playerId) ?? 0;

            return playerData;
          })
        );

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
