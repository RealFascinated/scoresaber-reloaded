import { env } from "@ssr/common/env";
import Logger, { type ScopedLogger } from "@ssr/common/logger";
import { ScoreSaberAccount } from "@ssr/common/schemas/scoresaber/account";
import {
  ScoreSaberPlayerHistory,
  ScoreSaberPlayerHistoryEntries,
} from "@ssr/common/schemas/scoresaber/player/history";
import { ScoreSaberPlayerStatistics } from "@ssr/common/schemas/scoresaber/player/statistics";
import type { ScoreSaberPlayerLookupToken } from "@ssr/common/schemas/scoresaber/tokens/v2/player/player";
import { ScoreSaberV2PlayerPageToken } from "@ssr/common/schemas/scoresaber/tokens/v2/player/players-page";
import { processInBatches } from "@ssr/common/utils/batch-utils";
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
import { PlayerBeatLeaderScoreSeedQueue } from "../../queue/impl/player-beatleader-score-seed-queue";
import { FetchMissingScoresQueue } from "../../queue/impl/player-scoresaber-scores-queue";
import { QueueId, QueueManager } from "../../queue/queue-manager";
import {
  PlayerHistoryRepository,
  type DailyScoreCounterKey,
} from "../../repositories/player-history.repository";
import { ScoreSaberAccountsRepository } from "../../repositories/scoresaber-accounts.repository";
import { ScoreSaberScoreHistoryRepository } from "../../repositories/scoresaber-score-history.repository";
import { ScoreSaberApiService } from "../external/scoresaber-api.service";
import { PlayerStatisticsService } from "../player-statistics/player-statistics.service";
import { PlayerCoreService } from "./player-core.service";

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

    const pages = Math.ceil(firstPage.metadata.totalItems / (firstPage.metadata.itemsPerPage ?? 100));
    PlayerHistoryService.logger.info(`Fetching ${pages} pages of players from ScoreSaber...`);
    PlayerHistoryService.logger.info(`Fetching page 1 of ${pages}...`);

    let successCount = 0;
    let errorCount = 0;

    const players: ScoreSaberV2PlayerPageToken[] = [...(firstPage.data ?? [])];

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
      players.push(...(response.data ?? []));
    }
    PlayerHistoryService.logger.info(`Found ${players.length} active players from ScoreSaber API`);

    const batchSize = Math.max(1, env.DATABASE_POOL_MAX - 10);

    await processInBatches(players, batchSize, async player => {
      const playerId = String(player.id);

      try {
        const account = await PlayerCoreService.getOrCreateAccount(playerId, player);
        const statistics = await PlayerHistoryService.trackPlayerHistory(account, now, player);

        // Update the player's inactive status if it has changed
        if (account.inactive !== player.inactive) {
          await PlayerCoreService.updatePlayer(account.id, { inactive: player.inactive });
          await redisClient.del(cachedPlayerTokenCacheKey(account.id));
        }

        // If the player has fewer recorded plays (current rows + archived attempts)
        // than their total play count, add them to the refresh queue. Replays are
        // archived to score history, so the current-rows count alone always looks
        // incomplete and re-queued the whole player base every night.
        if (statistics && !player.banned) {
          const recordedPlays =
            (statistics?.totalScores ?? 0) +
            (await ScoreSaberScoreHistoryRepository.countByPlayerId(playerId));
          if (recordedPlays < player.stats.totalSubmittedPlays) {
            PlayerHistoryService.logger.info(
              `Player ${playerId} has missing scores. Adding them to the refresh queue...`
            );
            // Add the player to the refresh queue
            (QueueManager.getQueue(QueueId.PlayerScoreRefreshQueue) as FetchMissingScoresQueue).add({
              id: playerId,
              data: playerId,
            });
            (
              QueueManager.getQueue(QueueId.PlayerBeatLeaderScoreSeedQueue) as PlayerBeatLeaderScoreSeedQueue
            ).add({
              id: playerId,
              data: playerId,
            });
          }
        }

        successCount++;

        if (successCount % 1000 === 0) {
          PlayerHistoryService.logger.info(`Tracked ${successCount}/${players.length} players...`);
        }
      } catch (err) {
        errorCount++;
        PlayerHistoryService.logger.error(`Failed to track player "${playerId}"`, err);
      }
    });

    const playerIds = new Set(players.map(player => String(player.id)));
    const activePlayerIdsArray = Array.from(playerIds);
    PlayerHistoryService.logger.info(`Found ${playerIds.size} active players from ScoreSaber API`);

    // Mark players as inactive
    const inactiveUpdate = await ScoreSaberAccountsRepository.markInactiveWhereIdNotIn(activePlayerIdsArray);
    const inactivePlayers = inactiveUpdate.rowCount ?? 0;

    if (inactivePlayers > 0) {
      PlayerHistoryService.logger.info(`Marked ${inactivePlayers} players as inactive`);
    }

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
    playerToken: ScoreSaberPlayerLookupToken
  ): Promise<ScoreSaberPlayerStatistics | undefined> {
    // Don't track inactive players
    if (!playerToken || playerToken.inactive) {
      return undefined;
    }

    await PlayerCoreService.updatePeakRank(playerToken);

    const date = getMidnightAlignedDate(trackTime);
    const existingEntry = await PlayerHistoryRepository.findByPlayerAndDate(player.id, date);

    const statistics = await PlayerStatisticsService.getStatistics(playerToken);
    await PlayerHistoryRepository.upsertByPlayerAndDate(
      player.id,
      date,
      PlayerHistoryService.createHistoryEntry(statistics, playerToken, existingEntry ?? undefined)
    );

    return statistics;
  }

  /**
   * Gets a player's statistic history for a specific day.
   *
   * @param playerToken the player to get the statistic history for
   * @param date the date to get the statistic history for
   * @param statistics the statistics to use
   * @param projection the projection to use
   * @param includeToday whether to include today's data even if the target date is not today
   * @returns the statistic history
   */
  public static async getPlayerStatisticHistory(
    playerToken: ScoreSaberPlayerLookupToken,
    date: Date,
    statistics: ScoreSaberPlayerStatistics,
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
      const todayData = await PlayerHistoryService.getTodayPlayerStatistic(playerToken, statistics);
      if (todayData) {
        if (isTargetToday) {
          history[dateKey] = todayData;
        } else {
          history[todayKey] = todayData;
        }
      }
    }

    // Past dates without a DB entry stay empty: ScoreSaber's v2 API no longer
    // exposes the daily `histories` string, so the DB history table (populated
    // by the nightly tracking job) is the only rank-history source.
    return history;
  }

  /**
   * Gets a player's statistic history for a specific date range.
   *
   * @param playerToken the player to get the statistic history for
   * @param count number of calendar days to include through today (inclusive), or `-1` for all stored history
   * @returns the statistic history
   */
  public static async getPlayerStatisticHistories(
    playerToken: ScoreSaberPlayerLookupToken,
    statistics: ScoreSaberPlayerStatistics,
    count: number
  ): Promise<ScoreSaberPlayerHistoryEntries> {
    const today = getMidnightAlignedDate(new Date());
    const allTime = count === -1;

    const alignedStart = allTime ? today : getMidnightAlignedDate(getDaysAgoDate(Math.max(0, count - 1)));

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

    const todayData = await PlayerHistoryService.getTodayPlayerStatistic(playerToken, statistics);
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
    playerToken: ScoreSaberPlayerLookupToken,
    statistics: ScoreSaberPlayerStatistics
  ): Promise<ScoreSaberPlayerHistory | undefined> {
    const today = getMidnightAlignedDate(new Date());
    const existingEntry = await PlayerHistoryRepository.findByPlayerAndDate(playerToken.id, today);
    return PlayerHistoryService.createHistoryEntry(statistics, playerToken, existingEntry ?? undefined);
  }

  /**
   * Creates a new player history entry from ScoreSaber data and existing history.
   *
   * @param playerToken the player token to create the history entry for
   * @param existingEntry the existing history entry to merge with
   * @returns the created history entry
   */
  public static createHistoryEntry(
    statistics: ScoreSaberPlayerStatistics,
    playerToken: ScoreSaberPlayerLookupToken,
    existingEntry?: PlayerHistoryRow
  ): ScoreSaberPlayerHistory {
    return {
      pp: statistics.pp,
      countryRank: statistics.countryRank,
      rank: statistics.rank,
      averageRankedAccuracy: statistics.averageRankedAccuracy,
      averageUnrankedAccuracy: statistics.averageUnrankedAccuracy,
      averageAccuracy: statistics.averageAccuracy,
      rankedScores: existingEntry?.rankedScores ?? 0,
      unrankedScores: existingEntry?.unrankedScores ?? 0,
      rankedScoresImproved: existingEntry?.rankedScoresImproved ?? 0,
      unrankedScoresImproved: existingEntry?.unrankedScoresImproved ?? 0,
      totalScores: statistics.totalScores,
      totalUnrankedScores: statistics.totalUnrankedScores,
      totalRankedScores: statistics.totalRankedScores,
      totalScore: statistics.totalScore,
      totalRankedScore: statistics.totalRankedScore,
      plusOnePp: playerToken.stats.plusOnePP ?? 0,
      aPlays: statistics.aPlays,
      sPlays: statistics.sPlays,
      spPlays: statistics.spPlays,
      ssPlays: statistics.ssPlays,
      sspPlays: statistics.sspPlays,
      godPlays: statistics.godPlays,
      medals: statistics.medals,
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
