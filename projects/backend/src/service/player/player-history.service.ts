import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { InternalServerError } from "@ssr/common/error/internal-server-error";
import Logger from "@ssr/common/logger";
import { Player, PlayerModel } from "@ssr/common/model/player";
import {
  PlayerHistoryEntry,
  PlayerHistoryEntryModel,
} from "@ssr/common/model/player/player-history-entry";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { removeObjectFields } from "@ssr/common/object.util";
import { PlayerStatisticHistory } from "@ssr/common/player/player-statistic-history";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { parseRankHistory } from "@ssr/common/utils/player-utils";
import {
  formatDateMinimal,
  getDaysAgoDate,
  getMidnightAlignedDate,
  isToday,
} from "@ssr/common/utils/time-utils";
import { isProduction } from "@ssr/common/utils/utils";
import { EmbedBuilder } from "discord.js";
import { DiscordChannels, logToChannel } from "../../bot/bot";
import { logNewTrackedPlayer } from "../../common/embds";
import { QueueId, QueueManager } from "../../queue/queue-manager";
import { accountCreationLock } from "./player-core.service";
import { PlayerService } from "./player.service";

const PLAYER_REFRESH_CONCURRENT_PAGE_FETCH_COUNT = 3;
const INACTIVE_RANK = 999_999;

export class PlayerHistoryService {
  /**
   * Tracks a player.
   *
   * @param id the player's id
   * @param playerToken an optional player token
   * @returns whether the player was successfully tracked
   */
  public static async trackPlayer(
    id: string,
    playerToken?: ScoreSaberPlayerToken
  ): Promise<boolean> {
    try {
      if (await PlayerService.playerExists(id)) {
        return true;
      }

      playerToken =
        playerToken ||
        (await ApiServiceRegistry.getInstance().getScoreSaberService().lookupPlayer(id));
      if (!playerToken) {
        return false;
      }

      // Create a new lock promise and assign it
      accountCreationLock[id] = (async () => {
        try {
          Logger.info(`Creating player "${id}"...`);
          const newPlayer = await PlayerModel.create({
            _id: id,
            joinedDate: new Date(playerToken.firstSeen),
            inactive: playerToken.inactive,
            name: playerToken.name,
            trackedSince: new Date(),
          });

          // Add to the seed queue
          QueueManager.getQueue(QueueId.PlayerScoreRefreshQueue).add(id);

          // Notify in production
          if (isProduction()) {
            await logNewTrackedPlayer(playerToken);
          }
          return newPlayer.toObject();
        } catch (err) {
          Logger.error(`Failed to create player document for "${id}"`, err);
          throw new InternalServerError(`Failed to create player document for "${id}"`);
        } finally {
          // Ensure the lock is always removed
          delete accountCreationLock[id];
        }
      })();

      // Wait for the player creation to complete
      await accountCreationLock[id];
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Updates the player statistics for all players.
   *
   * @param callback the callback that gets called when a page is fetched
   */
  public static async updatePlayerStatistics(
    callback?: (
      currentPage: number,
      totalPages: number,
      successCount: number,
      errorCount: number
    ) => void
  ) {
    const now = new Date();
    Logger.info("Starting player statistics update...");

    const firstPage = await ApiServiceRegistry.getInstance()
      .getScoreSaberService()
      .lookupPlayers(1);
    if (firstPage == undefined) {
      Logger.error("Failed to fetch players on page 1, skipping player statistics update...");
      return;
    }

    const pages = Math.ceil(firstPage.metadata.total / (firstPage.metadata.itemsPerPage ?? 100));
    Logger.info(`Fetching ${pages} pages of players from ScoreSaber...`);

    const PLAYER_TIMEOUT = 30000;
    let successCount = 0;
    let errorCount = 0;

    const playerIds = new Set<string>();

    // Process pages in batches
    for (
      let batchStart = 1;
      batchStart <= pages;
      batchStart += PLAYER_REFRESH_CONCURRENT_PAGE_FETCH_COUNT
    ) {
      const batchEnd = Math.min(batchStart + PLAYER_REFRESH_CONCURRENT_PAGE_FETCH_COUNT - 1, pages);
      Logger.info(`Processing pages ${batchStart} to ${batchEnd} concurrently...`);

      const batchPromises = [];
      for (let i = batchStart; i <= batchEnd; i++) {
        batchPromises.push(
          (async () => {
            Logger.info(`Fetching page ${i}...`);
            const page = await ApiServiceRegistry.getInstance()
              .getScoreSaberService()
              .lookupPlayers(i);

            if (page == undefined) {
              Logger.error(`Failed to fetch players on page ${i}, skipping page...`);
              errorCount++;
              return;
            }

            callback?.(i, pages, successCount, errorCount);
            Logger.info(`Processing page ${i} with ${page.players.length} players...`);

            await Promise.all(
              page.players.map(async player => {
                // Add player ids to the list
                if (playerIds.has(player.id)) {
                  return;
                }
                playerIds.add(player.id);

                let timeoutId: NodeJS.Timeout | undefined;
                try {
                  const timeoutPromise = new Promise((_, reject) => {
                    timeoutId = setTimeout(
                      () => reject(new Error(`Timeout processing player ${player.id}`)),
                      PLAYER_TIMEOUT
                    );
                  });

                  const processPromise = (async () => {
                    const foundPlayer = await PlayerService.getPlayer(player.id, player);
                    await PlayerService.trackPlayerHistory(foundPlayer, now, player);

                    // Get the total amount of scores tracked for this player
                    const trackedScores = await ScoreSaberScoreModel.countDocuments({
                      playerId: player.id,
                    });

                    // If the player has less scores tracked than the total play count, add them to the refresh queue
                    if (trackedScores < player.scoreStats.totalPlayCount) {
                      Logger.info(
                        `Player ${player.id} has missing scores. Adding them to the refresh queue...`
                      );
                      // Add the player to the refresh queue
                      QueueManager.getQueue(QueueId.PlayerScoreRefreshQueue).add(player.id);
                    }

                    successCount++;
                  })();

                  await Promise.race([processPromise, timeoutPromise]);
                } catch (error) {
                  Logger.error(
                    `Failed to track seeded player ${player.id} (${player.name}): ${error}`
                  );
                  errorCount++;
                } finally {
                  if (timeoutId) {
                    clearTimeout(timeoutId);
                  }
                }
              })
            );

            Logger.info(`Completed page ${i}`);
          })()
        );
      }

      // Wait for all pages in the current batch to complete
      await Promise.all(batchPromises);
      Logger.info(`Completed batch ${batchStart} to ${batchEnd}`);
    }

    // Log the number of active players found
    Logger.info(`Found ${playerIds.size} active players from ScoreSaber API`);

    // Get all player IDs from database
    const allPlayerIds = await PlayerModel.find({}, { _id: 1 });
    Logger.info(`Total players in database: ${allPlayerIds.length}`);

    // Mark players not in the active list as inactive
    for (const { _id } of allPlayerIds) {
      if (!playerIds.has(_id)) {
        await PlayerModel.updateOne({ _id }, { $set: { inactive: true } });
        Logger.info(`Marked player ${_id} as inactive`);
      }
    }

    const inactivePlayers = await PlayerModel.countDocuments({ inactive: true });

    logToChannel(
      DiscordChannels.BACKEND_LOGS,
      new EmbedBuilder()
        .setTitle(`Refreshed ${successCount} players.`)
        .setDescription(
          [
            `Successfully processed: ${successCount} players`,
            `Failed to process: ${errorCount} players`,
            `Inactive players: ${inactivePlayers}`,
          ].join("\n")
        )
        .setColor("#00ff00")
    );
    Logger.info(
      `Finished tracking player statistics in ${(performance.now() - now.getTime()).toFixed(0)}ms\n` +
        `Successfully processed: ${successCount} players\n` +
        `Failed to process: ${errorCount} players\n` +
        `Total inactive players: ${inactivePlayers}`
    );
  }

  /**
   * Tracks and updates a player's statistics for a specific date.
   * This method handles both new and existing players, updating their statistics
   * and handling inactive status.
   */
  public static async trackPlayerHistory(
    foundPlayer: Player,
    trackTime: Date,
    playerToken?: ScoreSaberPlayerToken
  ): Promise<void> {
    const before = performance.now();
    const player =
      playerToken ??
      (await ApiServiceRegistry.getInstance().getScoreSaberService().lookupPlayer(foundPlayer._id));

    if (!player) {
      Logger.warn(`Player "${foundPlayer._id}" not found on ScoreSaber`);
      return;
    }

    if (foundPlayer.inactive !== player.inactive) {
      await PlayerModel.updateOne(
        { _id: foundPlayer._id },
        { $set: { inactive: player.inactive } }
      );
      foundPlayer.inactive = player.inactive;
    }

    if (player.inactive) {
      Logger.info(`Player "${foundPlayer._id}" is inactive on ScoreSaber`);
      return;
    }

    const daysTracked = await this.getDaysTracked(foundPlayer._id);
    if (daysTracked === 0) {
      await this.seedPlayerHistory(foundPlayer, player);
    }

    if (foundPlayer.seededScores) {
      const existingEntry = await PlayerHistoryEntryModel.findOne({
        playerId: foundPlayer._id,
        date: getMidnightAlignedDate(trackTime),
      }).lean();

      const updatedHistory = await this.createPlayerStatistic(player, existingEntry ?? undefined);

      await PlayerHistoryEntryModel.findOneAndUpdate(
        { playerId: foundPlayer._id, date: getMidnightAlignedDate(trackTime) },
        updatedHistory,
        { upsert: true }
      );
    }

    await PlayerModel.updateOne({ _id: foundPlayer._id }, { $set: { lastTracked: new Date() } });
    foundPlayer.lastTracked = new Date();

    Logger.info(
      `Tracked player "${foundPlayer._id}" in ${(performance.now() - before).toFixed(0)}ms`
    );
  }

  /**
   * Gets a player's statistic history for a specific date range.
   */
  public static async getPlayerStatisticHistory(
    player: ScoreSaberPlayerToken,
    startDate: Date,
    endDate: Date,
    projection?: Record<string, string | number | boolean | object>
  ): Promise<PlayerStatisticHistory> {
    const startTimestamp = getMidnightAlignedDate(startDate).getTime();
    const endTimestamp = getMidnightAlignedDate(endDate).getTime();

    const isRangeIncludesToday = isToday(startDate) || isToday(endDate);

    // Ensure start date is before end date
    const [queryStart, queryEnd] =
      startTimestamp > endTimestamp
        ? [endTimestamp, startTimestamp]
        : [startTimestamp, endTimestamp];

    // Run queries in parallel
    const [entries, playerRankHistory] = await Promise.all([
      PlayerHistoryEntryModel.find({
        playerId: player.id,
        date: {
          $gte: new Date(queryStart),
          $lte: new Date(queryEnd),
        },
      })
        .select(projection ? { date: 1, ...projection } : {})
        .sort({ date: -1 })
        .lean(),
      parseRankHistory(player),
    ]);

    const history: PlayerStatisticHistory = {};
    for (const entry of entries) {
      const date = formatDateMinimal(entry.date);
      history[date] = PlayerHistoryService.playerHistoryToObject(entry);
    }

    // Process rank history in parallel chunks
    const daysDiff =
      Math.abs(Math.ceil((endTimestamp - startTimestamp) / (1000 * 60 * 60 * 24))) + 1;
    let daysAgo = 0;

    for (
      let i = playerRankHistory.length - 1;
      i >= Math.max(0, playerRankHistory.length - daysDiff - 1);
      i--
    ) {
      const rank = playerRankHistory[i];
      if (rank === INACTIVE_RANK || rank === 0) continue;

      const date = getMidnightAlignedDate(getDaysAgoDate(daysAgo));
      daysAgo += 1;

      const dateKey = formatDateMinimal(date);
      if (!history[dateKey] || history[dateKey].rank === undefined) {
        history[dateKey] = { rank };
      }
    }

    // Handle today's data if the range includes today
    if (isRangeIncludesToday) {
      const today = getMidnightAlignedDate(new Date());
      const todayKey = formatDateMinimal(today);

      // Get today's data from database or generate fresh
      const todayData = await PlayerHistoryService.getTodayPlayerStatistic(player, projection);
      if (todayData) {
        history[todayKey] = todayData;
      }
    }

    // Sort history by date
    return Object.fromEntries(
      Object.entries(history).sort((a, b) => {
        const dateA = new Date(a[0]);
        const dateB = new Date(b[0]);
        return dateB.getTime() - dateA.getTime();
      })
    );
  }

  /**
   * Gets today's player statistics, either from database or generates fresh data.
   */
  private static async getTodayPlayerStatistic(
    player: ScoreSaberPlayerToken,
    projection?: Record<string, string | number | boolean | object>
  ): Promise<Partial<PlayerHistoryEntry> | undefined> {
    const today = getMidnightAlignedDate(new Date());

    // Try to get existing data from database
    const existingEntry = await PlayerHistoryEntryModel.findOne({
      playerId: player.id,
      date: today,
    }).lean();

    // Generate fresh data, merging with existing if available
    const todayData = await this.createPlayerStatistic(player, existingEntry ?? undefined);

    return projection && Object.keys(projection).length > 0
      ? Object.fromEntries(Object.entries(todayData).filter(([key]) => key in projection))
      : todayData;
  }

  /**
   * Seeds a player's history with data from ScoreSaber API.
   * This method populates the player's rank history from their ScoreSaber profile.
   */
  public static async seedPlayerHistory(
    player: Player,
    playerToken: ScoreSaberPlayerToken
  ): Promise<void> {
    const playerRankHistory = parseRankHistory(playerToken);
    let daysAgo = 0;

    for (let i = playerRankHistory.length - daysAgo; i >= 0; i--) {
      const rank = playerRankHistory[i];
      if (rank === INACTIVE_RANK || rank === 0) continue;

      const date = getMidnightAlignedDate(getDaysAgoDate(daysAgo));
      await PlayerHistoryEntryModel.findOneAndUpdate(
        { playerId: player._id, date },
        { rank },
        { upsert: true }
      );
      daysAgo += 1;
    }
  }

  /**
   * Creates a new player statistic object from ScoreSaber data and existing history.
   */
  private static async createPlayerStatistic(
    playerToken: ScoreSaberPlayerToken,
    existingEntry?: Partial<PlayerHistoryEntry>
  ): Promise<Partial<PlayerHistoryEntry>> {
    const [accuracies, plusOnePp] = await Promise.all([
      PlayerService.getPlayerAverageAccuracies(playerToken.id),
      PlayerService.getPlayerPpBoundary(playerToken.id, 1),
    ]);

    return {
      pp: playerToken.pp,
      countryRank: playerToken.countryRank,
      rank: playerToken.rank,
      averageRankedAccuracy: playerToken.scoreStats.averageRankedAccuracy,
      averageUnrankedAccuracy: accuracies.unrankedAccuracy,
      averageAccuracy: accuracies.averageAccuracy,
      rankedScores: existingEntry?.rankedScores ?? 0,
      unrankedScores: existingEntry?.unrankedScores ?? 0,
      rankedScoresImproved: existingEntry?.rankedScoresImproved ?? 0,
      unrankedScoresImproved: existingEntry?.unrankedScoresImproved ?? 0,
      totalScores: playerToken.scoreStats.totalPlayCount,
      totalRankedScores: playerToken.scoreStats.rankedPlayCount,
      totalScore: playerToken.scoreStats.totalScore,
      totalRankedScore: playerToken.scoreStats.totalRankedScore,
      plusOnePp: plusOnePp[0],
    };
  }

  /**
   * Converts a database player history entry to a PlayerHistoryEntry.
   *
   * @param history the player history entry to convert
   * @returns the converted player history entry
   * @private
   */
  private static playerHistoryToObject(history: PlayerHistoryEntry): PlayerHistoryEntry {
    return {
      ...removeObjectFields<PlayerHistoryEntry>(history, ["_id", "__v", "playerId", "date"]),
    } as PlayerHistoryEntry;
  }

  /**
   * Gets the number of days tracked for a player.
   */
  private static async getDaysTracked(playerId: string): Promise<number> {
    return await PlayerHistoryEntryModel.countDocuments({ playerId });
  }
}
