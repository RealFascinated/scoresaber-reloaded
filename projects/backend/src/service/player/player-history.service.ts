import Logger from "@ssr/common/logger";
import { Player, PlayerModel } from "@ssr/common/model/player/player";
import {
  PlayerHistoryEntry,
  PlayerHistoryEntryModel,
} from "@ssr/common/model/player/player-history-entry";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { PlayerStatisticHistory } from "@ssr/common/player/player-statistic-history";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { processInBatches } from "@ssr/common/utils/batch-utils";
import { playerHistoryToObject } from "@ssr/common/utils/model-converters";
import { parseRankHistory } from "@ssr/common/utils/player-utils";
import {
  formatDateMinimal,
  getDaysAgoDate,
  getMidnightAlignedDate,
  isToday,
} from "@ssr/common/utils/time-utils";
import { EmbedBuilder } from "discord.js";
import { redisClient } from "../..";
import { DiscordChannels, sendEmbedToChannel } from "../../bot/bot";
import { FetchMissingScoresQueue } from "../../queue/impl/fetch-missing-scores-queue";
import { QueueId, QueueManager } from "../../queue/queue-manager";
import { ScoreSaberApiService } from "../scoresaber-api.service";
import { PlayerAccuraciesService } from "./player-accuracies.service";
import { PlayerCoreService } from "./player-core.service";
import { PlayerMedalsService } from "./player-medals.service";
import { PlayerRankedService } from "./player-ranked.service";

const INACTIVE_RANK = 999_999;

export class PlayerHistoryService {
  /**
   * Updates the player statistics for all players.
   *
   * @param callback the callback that gets called when a page is fetched
   */
  public static async updatePlayerStatistics() {
    const now = new Date();
    Logger.info("Starting player statistics update...");

    const firstPage = await ScoreSaberApiService.lookupPlayers(1);
    if (firstPage == undefined) {
      Logger.error("Failed to fetch players on page 1, skipping player statistics update...");
      return;
    }

    const pages = Math.ceil(firstPage.metadata.total / (firstPage.metadata.itemsPerPage ?? 100));
    Logger.info(`Fetching ${pages} pages of players from ScoreSaber...`);

    let successCount = 0;
    let errorCount = 0;

    const players: ScoreSaberPlayerToken[] = [];

    // Fetch all the active players from ScoreSaber
    for (let page = 1; page <= pages; page++) {
      if (page % 10 === 0 || page === 1 || page === pages) {
        Logger.info(`Fetching page ${page} of ${pages}...`);
      }
      const response = await ScoreSaberApiService.lookupPlayers(page);
      if (page == undefined) {
        Logger.error(`Failed to fetch players on page ${page}, skipping page...`);
        errorCount++;
        continue;
      }
      players.push(...(response?.players ?? []));
    }
    Logger.info(`Found ${players.length} active players from ScoreSaber API`);

    await processInBatches(players, 25, async player => {
      const foundPlayer = await PlayerCoreService.getPlayer(player.id, player);

      const [, trackedScores] = await Promise.all([
        // Track the player's history
        PlayerHistoryService.trackPlayerHistory(foundPlayer, now, player),

        // Get the number of scores tracked for the player
        ScoreSaberScoreModel.countDocuments({
          playerId: player.id,
        }),

        // Update the player's inactive status if it has changed
        foundPlayer.inactive !== player.inactive &&
          (async () => {
            PlayerModel.updateOne(
              { _id: foundPlayer._id },
              { $set: { inactive: player.inactive } }
            );
            redisClient.del(`scoresaber:cached-player:${foundPlayer._id}`);
          })(),
      ]);

      // If the player has less scores tracked than the total play count, add them to the refresh queue
      if (trackedScores < player.scoreStats.totalPlayCount && !player.banned) {
        Logger.info(`Player ${player.id} has missing scores. Adding them to the refresh queue...`);
        // Add the player to the refresh queue
        (QueueManager.getQueue(QueueId.PlayerScoreRefreshQueue) as FetchMissingScoresQueue).add({
          id: player.id,
          data: player.id,
        });
      }

      successCount++;
    });

    const playerIds = new Set(players.map(player => player.id));
    const activePlayerIdsArray = Array.from(playerIds);
    Logger.info(`Found ${playerIds.size} active players from ScoreSaber API`);

    // Mark players as inactive
    const result = await PlayerModel.updateMany(
      { _id: { $nin: activePlayerIdsArray } },
      { $set: { inactive: true } }
    );

    if (result.modifiedCount > 0) {
      Logger.info(`Marked ${result.modifiedCount} players as inactive`);
    }

    const inactivePlayers = await PlayerModel.countDocuments({ inactive: true });

    sendEmbedToChannel(
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
    const player = playerToken ?? (await ScoreSaberApiService.lookupPlayer(foundPlayer._id));

    // Don't track inactive players
    if (!player || player.inactive) {
      return;
    }

    const daysTracked = await PlayerHistoryService.getDaysTracked(foundPlayer._id);
    if (daysTracked === 0) {
      await PlayerHistoryService.seedPlayerRankHistory(foundPlayer, player);
    }

    if (foundPlayer.seededScores) {
      const existingEntry = await PlayerHistoryEntryModel.findOne({
        playerId: foundPlayer._id,
        date: getMidnightAlignedDate(trackTime),
      }).lean();

      const updatedHistory = await PlayerHistoryService.createHistoryEntry(
        player,
        existingEntry ?? undefined
      );
      await PlayerHistoryEntryModel.findOneAndUpdate(
        { playerId: foundPlayer._id, date: getMidnightAlignedDate(trackTime) },
        updatedHistory,
        { upsert: true }
      );
    }

    Logger.info(
      `Tracked player "${foundPlayer._id}" in ${(performance.now() - before).toFixed(0)}ms`
    );
  }

  /**
   * Gets a player's statistic history for a specific day.
   *
   * @param player the player to get the statistic history for
   * @param date the date to get the statistic history for
   * @param projection the projection to use
   * @param includeToday whether to include today's data even if the target date is not today
   * @returns the statistic history
   */
  public static async getPlayerStatisticHistory(
    player: ScoreSaberPlayerToken,
    date: Date,
    includeToday?: boolean,
    projection?: Record<string, string | number | boolean | object>
  ): Promise<PlayerStatisticHistory> {
    const targetDate = getMidnightAlignedDate(date);
    const dateKey = formatDateMinimal(targetDate);
    const isTargetToday = isToday(date);

    const history: PlayerStatisticHistory = {};

    // Get entry from database
    const entry = await PlayerHistoryEntryModel.findOne({
      playerId: player.id,
      date: targetDate,
    })
      .select(projection ? { date: 1, ...projection } : {})
      .lean()
      .hint({ playerId: 1, date: -1 });

    if (entry) {
      history[dateKey] = playerHistoryToObject(entry);
    }

    // Handle today's data if target is today or includeToday is true
    if (isTargetToday || includeToday) {
      const today = getMidnightAlignedDate(new Date());
      const todayKey = formatDateMinimal(today);
      const todayData = await PlayerHistoryService.getTodayPlayerStatistic(player);
      if (todayData) {
        if (isTargetToday) {
          history[dateKey] = todayData;
        } else {
          history[todayKey] = todayData;
        }
      }
    }

    if (!isTargetToday && !entry && !includeToday) {
      // If no entry found and not today, try to get rank from history
      const playerRankHistory = parseRankHistory(player);
      const daysAgo = Math.floor((Date.now() - targetDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysAgo >= 0 && daysAgo < playerRankHistory.length) {
        const rankIndex = playerRankHistory.length - 1 - daysAgo;
        const rank = playerRankHistory[rankIndex];
        if (rank !== INACTIVE_RANK && rank !== 0) {
          history[dateKey] = { rank };
        }
      }
    }
    return history;
  }

  /**
   * Gets a player's statistic history for a specific date range.
   *
   * @param player the player to get the statistic history for
   * @param startDate the start date to get the statistic history for
   * @param endDate the end date to get the statistic history for
   * @param projection the projection to use
   * @returns the statistic history
   */
  public static async getPlayerStatisticHistories(
    player: ScoreSaberPlayerToken,
    startDate: Date,
    endDate: Date
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
        .sort({ date: -1 })
        .lean()
        .hint({ playerId: 1, date: -1 }), // Force use of compound index
      parseRankHistory(player),
    ]);

    const history: PlayerStatisticHistory = {};
    for (const entry of entries) {
      const date = formatDateMinimal(entry.date);
      history[date] = playerHistoryToObject(entry);
    }

    const daysDiff =
      Math.abs(Math.ceil((endTimestamp - startTimestamp) / (1000 * 60 * 60 * 24))) + 1;

    // `parseRankHistory()` includes today's rank (playerToken.rank) as the last element.
    // ScoreSaber's `histories` string ends at yesterday, so we start at "yesterday"
    // (length - 2) and derive `daysAgo` from the array index to avoid off-by-one drift.
    const historyLength = playerRankHistory.length;
    for (
      let i = historyLength - 2; // yesterday
      i >= Math.max(0, historyLength - daysDiff);
      i--
    ) {
      const rank = playerRankHistory[i];
      // Player was inactive on this day
      if (rank === INACTIVE_RANK || rank === 0) {
        continue;
      }

      // last element is "today" => 0d ago, then 1d ago, etc.
      const daysAgo = historyLength - 1 - i;
      const date = getMidnightAlignedDate(getDaysAgoDate(daysAgo));
      const dateKey = formatDateMinimal(date);

      // If the rank is missing, add it to the history
      if (!history[dateKey] || history[dateKey].rank === undefined) {
        history[dateKey] = { rank };

        // Create a history entry for the date
        await PlayerHistoryEntryModel.findOneAndUpdate(
          {
            playerId: player.id,
            date,
          },
          { rank },
          { upsert: true }
        );
        Logger.info(
          `Created missing history entry for %s on %s`,
          player.name ?? player.id,
          dateKey
        );
      }
    }

    // Handle today's data if the range includes today
    if (isRangeIncludesToday) {
      const today = getMidnightAlignedDate(new Date());
      const todayKey = formatDateMinimal(today);

      const todayData = await PlayerHistoryService.getTodayPlayerStatistic(player);
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
  public static async getTodayPlayerStatistic(
    player: ScoreSaberPlayerToken
  ): Promise<Partial<PlayerHistoryEntry> | undefined> {
    const today = getMidnightAlignedDate(new Date());
    const existingEntry = await PlayerHistoryEntryModel.findOne({
      playerId: player.id,
      date: today,
    }).lean();

    return await PlayerHistoryService.createHistoryEntry(player, existingEntry ?? undefined);
  }

  /**
   * Seeds a player's history with data from ScoreSaber API.
   * This method populates the player's rank history from their ScoreSaber profile.
   */
  public static async seedPlayerRankHistory(
    player: Player,
    playerToken: ScoreSaberPlayerToken
  ): Promise<void> {
    const playerRankHistory = parseRankHistory(playerToken);
    const historyLength = playerRankHistory.length;

    for (let i = historyLength - 1; i >= 0; i--) {
      const rank = playerRankHistory[i];
      if (rank === INACTIVE_RANK || rank === 0) continue;

      // last element is "today" => 0d ago, then 1d ago, etc.
      const daysAgo = historyLength - 1 - i;
      const date = getMidnightAlignedDate(getDaysAgoDate(daysAgo));
      await PlayerHistoryEntryModel.findOneAndUpdate(
        { playerId: player._id, date },
        { rank },
        { upsert: true }
      );
    }
  }

  /**
   * Creates a new player history entry from ScoreSaber data and existing history.
   *
   * @param playerToken the player token to create the history entry for
   * @param existingEntry the existing history entry to merge with
   * @returns the created history entry
   */
  public static async createHistoryEntry(
    playerToken: ScoreSaberPlayerToken,
    existingEntry?: Partial<PlayerHistoryEntry>
  ): Promise<Partial<PlayerHistoryEntry>> {
    const [accuracies, plusOnePp, medals] = await Promise.all([
      PlayerAccuraciesService.getPlayerAverageAccuracies(playerToken.id),
      PlayerRankedService.getPlayerWeightedPpGainForRawPp(playerToken.id),
      PlayerMedalsService.getPlayerMedals(playerToken.id),
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
      totalUnrankedScores:
        playerToken.scoreStats.totalPlayCount - playerToken.scoreStats.rankedPlayCount,
      totalRankedScores: playerToken.scoreStats.rankedPlayCount,
      totalScore: playerToken.scoreStats.totalScore,
      totalRankedScore: playerToken.scoreStats.totalRankedScore,
      plusOnePp: plusOnePp,
      medals: medals,
    };
  }

  /**
   * Updates the player's daily score statistics.
   *
   * @param playerId the player id
   * @param isRanked whether the score is ranked
   * @param isImprovement whether this is an improvement over a previous score
   */
  public static async updatePlayerDailyScoreStats(
    playerId: string,
    isRanked: boolean,
    isImprovement: boolean
  ): Promise<void> {
    const getCounterToIncrement = (
      isRanked: boolean,
      isImprovement: boolean
    ): keyof PlayerHistoryEntry => {
      if (isRanked) {
        return isImprovement ? "rankedScoresImproved" : "rankedScores";
      }
      return isImprovement ? "unrankedScoresImproved" : "unrankedScores";
    };

    const today = getMidnightAlignedDate(new Date());
    await PlayerHistoryEntryModel.findOneAndUpdate(
      { playerId, date: today },
      {
        $inc: {
          [getCounterToIncrement(isRanked, isImprovement)]: 1,
        },
        $setOnInsert: {
          playerId,
          date: today,
        },
      },
      {
        upsert: true, // Create new entry if it doesn't exist
      }
    );
  }

  /**
   * Gets the number of days tracked for a player.
   */
  public static async getDaysTracked(playerId: string): Promise<number> {
    return await PlayerHistoryEntryModel.countDocuments({ playerId });
  }
}
