import Logger, { type ScopedLogger } from "@ssr/common/logger";
import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import { ScoreSaberPlayerHistoryEntries } from "@ssr/common/schemas/scoresaber/player/history";
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
import { playerHistoryRowToType } from "../../db/converter/player-history";
import { scoreSaberAccountRowToType } from "../../db/converter/scoresaber-account";
import { type PlayerHistoryRow, type ScoreSaberAccountRow } from "../../db/schema";
import {
  PlayerHistoryRepository,
  type DailyScoreCounterKey,
} from "../../repositories/player-history.repository";
import { ScoreSaberAccountsRepository } from "../../repositories/scoresaber-accounts.repository";
import { ScoreSaberScoreHistoryRepository } from "../../repositories/scoresaber-score-history.repository";
import {
  ScoreSaberScoresRepository,
  emptyScoreSaberPlayerScoreStatistics,
} from "../../repositories/scoresaber-scores.repository";
import { ScoreSaberApiService } from "../external/scoresaber-api.service";
import { PlayerStatisticsService } from "../player-statistics/player-statistics.service";
import { RealmService } from "../realm/realm.service";
import { PlayerCoreService } from "./player-core.service";
import { PlayerScoresService } from "./player-scores.service";
import ScoreSaberPlayerService from "./scoresaber-player.service";

const CHUNK_SIZE = 250;
const CHUNKS_IN_FLIGHT = 2;
const ACCOUNT_WRITE_CONCURRENCY = 10;

export class PlayerHistoryService {
  private static readonly logger: ScopedLogger = Logger.withTopic("Player History");

  /**
   * Tracks the daily statistics of every ranked player in every realm, a chunk of players at a time.
   */
  public static async updatePlayerStatistics() {
    const now = new Date();
    PlayerHistoryService.logger.info("Starting player statistics update...");

    const result = await PlayerHistoryService.trackRealmPlayers(DEFAULT_REALM_ID, now);
    if (result === undefined) {
      PlayerHistoryService.logger.error(
        "Failed to fetch players on page 1, skipping player statistics update..."
      );
      return;
    }

    for (const realmId of (await RealmService.getRealmIds()).filter(id => id !== DEFAULT_REALM_ID)) {
      try {
        const realmResult = await PlayerHistoryService.trackRealmPlayers(realmId, now);
        if (realmResult === undefined) {
          PlayerHistoryService.logger.error(`Failed to fetch players for realm "${realmId}", skipping...`);
          continue;
        }
        PlayerHistoryService.logger.info(
          `Tracked ${realmResult.tracked}/${realmResult.playerIds.length} players in realm "${realmId}"`
        );
      } catch (err) {
        PlayerHistoryService.logger.error(`Failed to track realm "${realmId}" player statistics`, err);
      }
    }

    const inactiveUpdate = await ScoreSaberAccountsRepository.markInactiveWhereIdNotIn(result.playerIds);
    const inactivePlayers = inactiveUpdate.rowCount ?? 0;
    if (inactivePlayers > 0) {
      PlayerHistoryService.logger.info(`Marked ${inactivePlayers} players as inactive`);
    }

    const errorCount = result.failed + result.failedPages;
    sendEmbedToChannel(
      DiscordChannels.BACKEND_LOGS,
      new EmbedBuilder()
        .setTitle(`Refreshed ${result.tracked} players.`)
        .setDescription(
          [
            `Successfully processed: ${result.tracked} players`,
            `Failed to process: ${errorCount} players`,
            `Inactive players: ${inactivePlayers}`,
          ].join("\n")
        )
        .setColor("#00ff00")
    );
    PlayerHistoryService.logger.info(
      `Finished tracking player statistics in ${(Date.now() - now.getTime()).toFixed(0)}ms\n` +
        `Successfully processed: ${result.tracked} players\n` +
        `Failed to process: ${errorCount} players\n` +
        `Total inactive players: ${inactivePlayers}`
    );
  }

  private static async trackRealmPlayers(realmId: number, trackTime: Date) {
    const firstPage = await ScoreSaberApiService.lookupPlayers(1, { realmId, skipCache: true });
    if (firstPage == undefined) {
      return undefined;
    }

    const pages = Math.ceil(firstPage.metadata.totalItems / (firstPage.metadata.itemsPerPage ?? 100));
    PlayerHistoryService.logger.info(`Tracking ${pages} pages of players in realm "${realmId}"...`);

    const playerIds: string[] = [];
    const inFlight = new Set<Promise<void>>();
    let pending: ScoreSaberV2PlayerPageToken[] = [];
    let tracked = 0;
    let failed = 0;
    let failedPages = 0;

    const startChunk = async (players: ScoreSaberV2PlayerPageToken[]) => {
      const chunk: Promise<void> = PlayerHistoryService.trackPlayersChunk(players, realmId, trackTime)
        .then(
          count => {
            tracked += count;
            failed += players.length - count;
          },
          err => {
            failed += players.length;
            PlayerHistoryService.logger.error(
              `Failed to track a chunk of players in realm "${realmId}"`,
              err
            );
          }
        )
        .finally(() => inFlight.delete(chunk));
      inFlight.add(chunk);
      if (inFlight.size >= CHUNKS_IN_FLIGHT) {
        await Promise.race(inFlight);
      }
    };
    const accept = async (players: ScoreSaberV2PlayerPageToken[]) => {
      for (const player of players) {
        playerIds.push(String(player.id));
      }
      pending = pending.concat(players);
      while (pending.length >= CHUNK_SIZE) {
        await startChunk(pending.slice(0, CHUNK_SIZE));
        pending = pending.slice(CHUNK_SIZE);
      }
    };

    await accept(firstPage.data ?? []);
    for (let page = 2; page <= pages; page++) {
      const response = await ScoreSaberApiService.lookupPlayers(page, { realmId, skipCache: true });
      if (response == undefined) {
        PlayerHistoryService.logger.error(`Failed to fetch players on page ${page}, skipping page...`);
        failedPages++;
        continue;
      }
      await accept(response.data ?? []);
      if (page % 100 === 0) {
        PlayerHistoryService.logger.info(`Tracked ${tracked} players, fetched page ${page} of ${pages}...`);
      }
    }
    if (pending.length > 0) {
      await startChunk(pending);
    }
    await Promise.all(inFlight);

    return { playerIds, tracked, failed, failedPages };
  }

  private static async trackPlayersChunk(
    players: ScoreSaberV2PlayerPageToken[],
    realmId: number,
    trackTime: Date
  ) {
    const isDefaultRealm = realmId === DEFAULT_REALM_ID;
    const ids = players.map(player => String(player.id));
    const accounts = new Map(
      (await ScoreSaberAccountsRepository.findManyByIds(ids)).map(account => [account.id, account])
    );

    const missing = players.filter(player => !accounts.has(String(player.id)));
    if (missing.length > 0) {
      await processInBatches(missing, ACCOUNT_WRITE_CONCURRENCY, async player => {
        try {
          await PlayerCoreService.getOrCreateAccount(String(player.id), player);
        } catch (err) {
          PlayerHistoryService.logger.error(`Failed to create player "${player.id}"`, err);
        }
      });
      const created = await ScoreSaberAccountsRepository.findManyByIds(
        missing.map(player => String(player.id))
      );
      for (const account of created) {
        accounts.set(account.id, account);
      }
    }

    const tracked = players.flatMap(player => {
      const account = accounts.get(String(player.id));
      return account ? [{ player, account }] : [];
    });

    const changed = tracked.flatMap(({ player, account }) => {
      const updates: Partial<Omit<ScoreSaberAccountRow, "id">> = PlayerCoreService.accountUpdatesFromToken(
        account,
        player
      );
      if (isDefaultRealm && account.inactive !== player.inactive) {
        updates.inactive = player.inactive;
      }
      const rank = player.stats.rank;
      if (
        isDefaultRealm &&
        !player.inactive &&
        rank !== 0 &&
        account.peakRank !== rank &&
        (!account.peakRank || rank < account.peakRank)
      ) {
        updates.peakRank = rank;
        updates.peakRankTimestamp = trackTime;
      }
      return Object.keys(updates).length > 0 ? [{ account, updates }] : [];
    });
    await processInBatches(changed, ACCOUNT_WRITE_CONCURRENCY, async ({ account, updates }) => {
      await PlayerCoreService.updatePlayer(account.id, updates);
      Object.assign(account, updates);
    });

    const active = tracked.filter(({ player }) => !player.inactive);
    const scoreStatistics = await ScoreSaberScoresRepository.getPlayersScoreStatistics(
      active.map(({ account }) => account.id),
      realmId
    );
    const date = getMidnightAlignedDate(trackTime);
    await PlayerHistoryRepository.upsertMany(
      active.map(({ player, account }) => ({
        playerId: account.id,
        date,
        data: PlayerHistoryService.createHistoryEntry(
          PlayerStatisticsService.buildStatistics(
            player,
            account.medals,
            scoreStatistics.get(account.id)?.statistics ?? emptyScoreSaberPlayerScoreStatistics()
          ),
          player
        ),
      })),
      realmId
    );

    await Promise.all(
      tracked.map(({ player, account }) =>
        ScoreSaberPlayerService.cacheBasicPlayer(player, scoreSaberAccountRowToType(account), realmId)
      )
    );
    await PlayerCoreService.invalidatePlayersCaches(
      tracked.map(({ account }) => account.id),
      { detailTypes: ["full"], realmIds: [realmId] }
    );

    if (isDefaultRealm) {
      await PlayerHistoryService.checkScoreCounts(
        active.filter(({ player }) => !player.banned).map(({ player }) => player)
      );
    }

    return tracked.length;
  }

  private static async checkScoreCounts(players: ScoreSaberV2PlayerPageToken[]) {
    const ids = players.map(player => String(player.id));
    const [recordedScores, archivedScores] = await Promise.all([
      ScoreSaberScoresRepository.countByPlayerIds(ids),
      ScoreSaberScoreHistoryRepository.countByPlayerIds(ids),
    ]);
    const behind = players.filter(player => {
      const id = String(player.id);
      return (recordedScores.get(id) ?? 0) + (archivedScores.get(id) ?? 0) < player.stats.totalSubmittedPlays;
    });
    await processInBatches(behind, ACCOUNT_WRITE_CONCURRENCY, async player => {
      try {
        await PlayerScoresService.checkScoreCountFromApi(String(player.id));
      } catch (err) {
        PlayerHistoryService.logger.error(`Failed to check the score count of "${player.id}"`, err);
      }
    });
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
    includeToday: boolean | undefined,
    realmId: number
  ) {
    const targetDate = getMidnightAlignedDate(date);
    const dateKey = formatDateMinimal(targetDate);
    const isTargetToday = isToday(date);

    const history: ScoreSaberPlayerHistoryEntries = {};

    const entry = await PlayerHistoryRepository.findByPlayerAndDate(playerToken.id, targetDate, realmId);

    if (entry) {
      history[dateKey] = playerHistoryRowToType(entry);
    }

    if (isTargetToday || includeToday) {
      const today = getMidnightAlignedDate(new Date());
      const todayKey = formatDateMinimal(today);
      const todayData = await PlayerHistoryService.getTodayPlayerStatistic(playerToken, statistics, realmId);
      if (todayData) {
        if (isTargetToday) {
          history[dateKey] = todayData;
        } else {
          history[todayKey] = todayData;
        }
      }
    }

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
    count: number,
    realmId: number
  ) {
    const today = getMidnightAlignedDate(new Date());
    const allTime = count === -1;

    const alignedStart = allTime ? today : getMidnightAlignedDate(getDaysAgoDate(Math.max(0, count - 1)));

    const entries = await PlayerHistoryRepository.getByPlayerOrderedByDateDesc(
      playerToken.id,
      {
        count,
        alignedStart,
        today,
      },
      realmId
    );

    const history: ScoreSaberPlayerHistoryEntries = {};
    for (const entry of entries) {
      const dateKey = formatDateMinimal(entry.date);
      history[dateKey] = playerHistoryRowToType(entry);
    }

    const todayData = await PlayerHistoryService.getTodayPlayerStatistic(playerToken, statistics, realmId);
    if (todayData) {
      history[formatDateMinimal(today)] = todayData;
    }

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
    statistics: ScoreSaberPlayerStatistics,
    realmId: number
  ) {
    const today = getMidnightAlignedDate(new Date());
    const existingEntry = await PlayerHistoryRepository.findByPlayerAndDate(playerToken.id, today, realmId);
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
  ) {
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
  ) {
    const getCounterToIncrement = (ranked: boolean, improvement: boolean) => {
      if (ranked) {
        return improvement ? "rankedScoresImproved" : "rankedScores";
      }
      return improvement ? "unrankedScoresImproved" : "unrankedScores";
    };

    const today = getMidnightAlignedDate(new Date());
    const counterKey = getCounterToIncrement(isRanked, isImprovement) as DailyScoreCounterKey;

    await PlayerHistoryRepository.incrementDailyCounter(playerId, today, counterKey, DEFAULT_REALM_ID);
  }
}
