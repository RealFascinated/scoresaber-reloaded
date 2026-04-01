import Logger, { type ScopedLogger } from "@ssr/common/logger";
import { ScoreSaberAccount } from "@ssr/common/schemas/scoresaber/account";
import {
  ScoreSaberPlayerHistory,
  ScoreSaberPlayerHistoryEntries,
} from "@ssr/common/schemas/scoresaber/player/history";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { processInBatches } from "@ssr/common/utils/batch-utils";
import { parseRankHistory } from "@ssr/common/utils/player-utils";
import {
  formatDateMinimal,
  getDaysAgoDate,
  getMidnightAlignedDate,
  isToday,
} from "@ssr/common/utils/time-utils";
import { EmbedBuilder } from "discord.js";
import { DiscordChannels, sendEmbedToChannel } from "../../bot/bot";
import { cachedPlayerTokenCacheKey } from "../../common/cache-keys";
import { redisClient } from "../../common/redis";
import { playerHistoryRowToType } from "../../db/converter/player-history";
import { type PlayerHistoryRow } from "../../db/schema";
import { FetchMissingScoresQueue } from "../../queue/impl/player-scoresaber-scores-queue";
import { QueueId, QueueManager } from "../../queue/queue-manager";
import {
  PlayerHistoryRepository,
  type DailyScoreCounterKey,
} from "../../repositories/player-history.repository";
import { ScoreSaberAccountsRepository } from "../../repositories/scoresaber-accounts.repository";
import { ScoreSaberScoresRepository } from "../../repositories/scoresaber-scores.repository";
import { ScoreSaberApiService } from "../external/scoresaber-api.service";
import { PlayerCoreService } from "./player-core.service";
import { PlayerRankedService } from "./player-ranked.service";

const INACTIVE_RANK = 999_999;

export class PlayerHistoryService {
  private static readonly logger: ScopedLogger = Logger.withTopic("Player History");

  /**
   * Updates the player statistics for all players.
   *
   * @param callback the callback that gets called when a page is fetched
   */
  public static async updatePlayerStatistics() {
    const now = new Date();
    PlayerHistoryService.logger.info("Starting player statistics update...");

    const firstPage = await ScoreSaberApiService.lookupPlayers(1);
    if (firstPage == undefined) {
      PlayerHistoryService.logger.error(
        "Failed to fetch players on page 1, skipping player statistics update..."
      );
      return;
    }

    const pages = Math.ceil(firstPage.metadata.total / (firstPage.metadata.itemsPerPage ?? 100));
    PlayerHistoryService.logger.info(`Fetching ${pages} pages of players from ScoreSaber...`);
    PlayerHistoryService.logger.info(`Fetching page 1 of ${pages}...`);

    let successCount = 0;
    let errorCount = 0;

    const players: ScoreSaberPlayerToken[] = [...(firstPage.players ?? [])];

    for (let page = 2; page <= pages; page++) {
      if (page % 10 === 0 || page === pages) {
        PlayerHistoryService.logger.info(`Fetching page ${page} of ${pages}...`);
      }
      const response = await ScoreSaberApiService.lookupPlayers(page);
      if (response == undefined) {
        PlayerHistoryService.logger.error(`Failed to fetch players on page ${page}, skipping page...`);
        errorCount++;
        continue;
      }
      players.push(...(response.players ?? []));
    }
    PlayerHistoryService.logger.info(`Found ${players.length} active players from ScoreSaber API`);

    await processInBatches(players, 25, async player => {
      const foundPlayer = await PlayerCoreService.getOrCreateAccount(player.id, player);

      const [, trackedScores] = await Promise.all([
        // Track the player's history
        PlayerHistoryService.trackPlayerHistory(foundPlayer, now, player),

        // Get the number of scores tracked for the player
        ScoreSaberScoresRepository.countByPlayerId(player.id),

        // Update the player's inactive status if it has changed
        foundPlayer.inactive !== player.inactive &&
          (async () => {
            await PlayerCoreService.updatePlayer(foundPlayer.id, { inactive: player.inactive });
            redisClient.del(cachedPlayerTokenCacheKey(foundPlayer.id));
          })(),
      ]);

      // If the player has less scores tracked than the total play count, add them to the refresh queue
      if (trackedScores < player.scoreStats.totalPlayCount && !player.banned) {
        PlayerHistoryService.logger.info(
          `Player ${player.id} has missing scores. Adding them to the refresh queue...`
        );
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
    PlayerHistoryService.logger.info(`Found ${playerIds.size} active players from ScoreSaber API`);

    // Mark players as inactive (Mongo `$nin: []` matches all ids when the list is empty)
    const inactiveUpdate = await ScoreSaberAccountsRepository.markInactiveWhereIdNotIn(activePlayerIdsArray);

    if ((inactiveUpdate.rowCount ?? 0) > 0) {
      PlayerHistoryService.logger.info(`Marked ${inactiveUpdate.rowCount} players as inactive`);
    }

    const inactivePlayers = await ScoreSaberAccountsRepository.countInactive();

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
    PlayerHistoryService.logger.info(
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
   *
   * @param player the player to track the history for
   * @param trackTime the time to track the history for
   * @param playerToken the player token to track the history for
   */
  public static async trackPlayerHistory(
    player: ScoreSaberAccount,
    trackTime: Date,
    playerToken: ScoreSaberPlayerToken
  ): Promise<void> {
    const before = performance.now();

    // Don't track inactive players
    if (!playerToken || playerToken.inactive) {
      return;
    }

    await PlayerCoreService.updatePeakRank(playerToken);

    const daysTracked = await PlayerHistoryRepository.countRowsForPlayer(player.id);
    if (daysTracked === 0) {
      await PlayerHistoryService.seedPlayerRankHistory(player, playerToken);
    }

    const date = getMidnightAlignedDate(trackTime);

    const existingEntry = await PlayerHistoryRepository.findByPlayerAndDate(player.id, date);

    const updatedHistory = await PlayerHistoryService.createHistoryEntry(
      playerToken,
      player,
      existingEntry ?? undefined
    );

    await PlayerHistoryRepository.upsertByPlayerAndDate(player.id, date, existingEntry, updatedHistory);

    PlayerHistoryService.logger.info(
      `Tracked player "${player.id}" in ${(performance.now() - before).toFixed(0)}ms`
    );
  }

  /**
   * Gets a player's statistic history for a specific day.
   *
   * @param playerToken the player to get the statistic history for
   * @param date the date to get the statistic history for
   * @param projection the projection to use
   * @param includeToday whether to include today's data even if the target date is not today
   * @returns the statistic history
   */
  public static async getPlayerStatisticHistory(
    playerToken: ScoreSaberPlayerToken,
    date: Date,
    includeToday?: boolean
  ): Promise<ScoreSaberPlayerHistoryEntries> {
    const targetDate = getMidnightAlignedDate(date);
    const dateKey = formatDateMinimal(targetDate);
    const isTargetToday = isToday(date);

    const history: ScoreSaberPlayerHistoryEntries = {};

    const entry = await PlayerHistoryRepository.findByPlayerAndDate(playerToken.id, targetDate);

    if (entry) {
      history[dateKey] = playerHistoryRowToType(entry);
    }

    // Handle today's data if target is today or includeToday is true
    if (isTargetToday || includeToday) {
      const today = getMidnightAlignedDate(new Date());
      const todayKey = formatDateMinimal(today);
      const todayData = await PlayerHistoryService.getTodayPlayerStatistic(playerToken);
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
      const playerRankHistory = parseRankHistory(playerToken);
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
   * @param playerToken the player to get the statistic history for
   * @param startDate the start date to get the statistic history for
   * @param endDate the end date to get the statistic history for
   * @param projection the projection to use
   * @returns the statistic history
   */
  public static async getPlayerStatisticHistories(
    playerToken: ScoreSaberPlayerToken,
    count: number
  ): Promise<ScoreSaberPlayerHistoryEntries> {
    const today = getMidnightAlignedDate(new Date());
    const startDate = getDaysAgoDate(count);
    const alignedStart = getMidnightAlignedDate(startDate);

    const startTimestamp = alignedStart.getTime();
    const endTimestamp = today.getTime();

    const entries = await PlayerHistoryRepository.getByPlayerOrderedByDateDesc(playerToken.id, {
      count,
      alignedStart,
      today,
    });

    const history: ScoreSaberPlayerHistoryEntries = {};
    for (const entry of entries) {
      const dateKey = formatDateMinimal(entry.date);
      history[dateKey] = playerHistoryRowToType(entry);
    }

    const daysDiff = Math.abs(Math.ceil((endTimestamp - startTimestamp) / (1000 * 60 * 60 * 24))) + 1;

    // `parseRankHistory()` includes today's rank (playerToken.rank) as the last element.
    // ScoreSaber's `histories` string ends at yesterday, so we start at "yesterday"
    // (length - 2) and derive `daysAgo` from the array index to avoid off-by-one drift.
    const playerRankHistory = parseRankHistory(playerToken);
    const historyLength = playerRankHistory.length;
    const missingRankUpserts: Array<{ date: Date; rank: number }> = [];
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

        missingRankUpserts.push({ date, rank });
      }
    }

    if (missingRankUpserts.length > 0) {
      await Promise.all(
        missingRankUpserts.map(({ date, rank }) =>
          PlayerHistoryRepository.upsertRank(playerToken.id, date, rank)
        )
      );
      PlayerHistoryService.logger.info(
        `Bulk-upserted ${missingRankUpserts.length} missing history entries for ${playerToken.name ?? playerToken.id}`
      );
    }

    const todayData = await PlayerHistoryService.getTodayPlayerStatistic(playerToken);
    if (todayData) {
      history[formatDateMinimal(today)] = todayData;
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
    playerToken: ScoreSaberPlayerToken
  ): Promise<ScoreSaberPlayerHistory | undefined> {
    const today = getMidnightAlignedDate(new Date());
    const existingEntry = await PlayerHistoryRepository.findByPlayerAndDate(playerToken.id, today);

    const player = await PlayerCoreService.getOrCreateAccount(playerToken.id, playerToken);
    return await PlayerHistoryService.createHistoryEntry(playerToken, player, existingEntry ?? undefined);
  }

  /**
   * Seeds a player's history with data from ScoreSaber API.
   * This method populates the player's rank history from their ScoreSaber profile.
   */
  public static async seedPlayerRankHistory(
    account: ScoreSaberAccount,
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
      await PlayerHistoryRepository.upsertRank(account.id, date, rank);
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
    account: ScoreSaberAccount,
    existingEntry?: PlayerHistoryRow
  ): Promise<ScoreSaberPlayerHistory> {
    const [accuracies, plusOnePp, medals] = await Promise.all([
      ScoreSaberScoresRepository.getAverageAccuracies(playerToken.id),
      PlayerRankedService.getPlayerPlusOnePp(playerToken.id),
      ScoreSaberAccountsRepository.getMedalsForPlayerId(playerToken.id),
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
      totalUnrankedScores: playerToken.scoreStats.totalPlayCount - playerToken.scoreStats.rankedPlayCount,
      totalRankedScores: playerToken.scoreStats.rankedPlayCount,
      totalScore: playerToken.scoreStats.totalScore,
      totalRankedScore: playerToken.scoreStats.totalRankedScore,
      plusOnePp: plusOnePp,
      aPlays: account.scoreStats?.aPlays ?? 0,
      sPlays: account.scoreStats?.sPlays ?? 0,
      spPlays: account.scoreStats?.spPlays ?? 0,
      ssPlays: account.scoreStats?.ssPlays ?? 0,
      sspPlays: account.scoreStats?.sspPlays ?? 0,
      godPlays: account.scoreStats?.godPlays ?? 0,
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
    const getCounterToIncrement = (ranked: boolean, improvement: boolean) => {
      if (ranked) {
        return improvement ? "rankedScoresImproved" : "rankedScores";
      }
      return improvement ? "unrankedScoresImproved" : "unrankedScores";
    };

    const today = getMidnightAlignedDate(new Date());
    const counterKey = getCounterToIncrement(isRanked, isImprovement) as DailyScoreCounterKey;

    await PlayerHistoryRepository.incrementDailyCounter(playerId, today, counterKey);
  }
}
