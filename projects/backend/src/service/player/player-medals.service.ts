import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { DetailType } from "@ssr/common/detail-type";
import Logger from "@ssr/common/logger";
import { MEDAL_COUNTS } from "@ssr/common/medal";
import { PlayerModel } from "@ssr/common/model/player/player";
import { Page, Pagination } from "@ssr/common/pagination";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { LeaderboardService } from "../leaderboard/leaderboard.service";
import ScoreSaberService from "../scoresaber.service";

type PlayerMedalsRefreshCallback = (currentPage: number, totalPages: number) => Promise<void>;

export class PlayerMedalsService {
  /**
   * Updates the medal count for a player.
   *
   * @param playerId the id of the player
   * @param rankedLeaderboards the ranked leaderboards
   * @param callback the callback to call after each page is processed
   */
  public static async updatePlayerMedalCounts(
    callback?: PlayerMedalsRefreshCallback
  ): Promise<void> {
    const before = performance.now();
    await PlayerMedalsService.updatePlayerGlobalMedalCounts(callback);
    await PlayerMedalsService.updatePlayerMedalsRank();
    Logger.debug(
      `Updated medal counts for all players in ${formatDuration(performance.now() - before)}`
    );
  }

  /**
   * Updates the global medal count for all players.
   */
  public static async updatePlayerGlobalMedalCounts(
    callback?: PlayerMedalsRefreshCallback
  ): Promise<void> {
    const rankedLeaderboards = await LeaderboardService.getRankedLeaderboards();

    const playerMedalCounts = new Map<string, number>();

    // Get the medal counts for each player
    for (const [index, leaderboard] of rankedLeaderboards.entries()) {
      const firstPage = await ApiServiceRegistry.getInstance()
        .getScoreSaberService()
        .lookupLeaderboardScores(leaderboard.id, 1);
      if (!firstPage) {
        continue;
      }

      if (callback) {
        await callback(index + 1, rankedLeaderboards.length);
      }

      const scores = firstPage.scores;
      for (const score of scores) {
        if (score.rank > 10) {
          continue;
        }

        for (const [rank, medalCount] of Object.entries(MEDAL_COUNTS)) {
          if (score.rank <= parseInt(rank)) {
            playerMedalCounts.set(
              score.leaderboardPlayerInfo.id,
              (playerMedalCounts.get(score.leaderboardPlayerInfo.id) || 0) + medalCount
            );
            break;
          }
        }
      }

      if (callback) {
        await callback(index + 1, rankedLeaderboards.length);
      }

      if (index % 100 === 0) {
        Logger.info(
          `[PLAYER MEDALS] Finished processing leaderboard page ${index + 1}/${rankedLeaderboards.length}`
        );
      }
    }

    // Get all players with medals > 0
    const playersWithMedals = await PlayerModel.find({
      medals: { $gt: 0 },
    });

    // Remove old medal counts
    for (const player of playersWithMedals) {
      const medalCount = playerMedalCounts.get(player.id);
      if (!medalCount) {
        await PlayerModel.updateOne({ _id: player._id }, { $set: { medals: 0 } });
      }
    }

    // Add new medal counts
    for (const [playerId, medalCount] of playerMedalCounts) {
      await PlayerModel.updateOne({ _id: playerId }, { $set: { medals: medalCount } });
    }

    if (callback) {
      await callback(rankedLeaderboards.length, rankedLeaderboards.length);
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

      const cachedPlayers = new Map<string, ScoreSaberPlayerToken>();
      for (const player of players) {
        cachedPlayers.set(player.id, await ScoreSaberService.getCachedPlayer(player.id, true));
      }

      return await Promise.all(
        players.map(async player =>
          ScoreSaberService.getPlayer(player.id, DetailType.BASIC, cachedPlayers.get(player.id))
        )
      );
    });
  }
}
