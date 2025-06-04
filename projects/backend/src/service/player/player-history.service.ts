import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger from "@ssr/common/logger";
import { PlayerDocument, PlayerModel } from "@ssr/common/model/player";
import { PlayerAccuracies } from "@ssr/common/player/player-accuracies";
import { PlayerStatisticHistory } from "@ssr/common/player/player-statistic-history";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { getScoreSaberLeaderboardFromToken } from "@ssr/common/token-creators";
import { PlayerStatistic, ScoreCalendarData } from "@ssr/common/types/player/player-statistic";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import ScoreSaberPlayerScoreToken from "@ssr/common/types/token/scoresaber/player-score";
import {
  formatDateMinimal,
  getDaysAgoDate,
  getMidnightAlignedDate,
} from "@ssr/common/utils/time-utils";
import { fetchWithCache } from "../../common/cache.util";
import CacheService, { ServiceCache } from "../cache.service";
import { PlayerAccuracyService } from "./player-accuracy.service";
import { PlayerRankingService } from "./player-ranking.service";

export class PlayerHistoryService {
  private static readonly INACTIVE_RANK = 999_999;

  /**
   * Seeds a player's history with data from ScoreSaber API.
   * This method populates the player's rank history from their ScoreSaber profile.
   *
   * @param player - The player document to seed history for
   * @param playerToken - The ScoreSaber player token containing rank history
   * @throws {Error} If the player document cannot be saved
   */
  public static async seedPlayerHistory(
    player: PlayerDocument,
    playerToken: ScoreSaberPlayerToken
  ): Promise<void> {
    const playerRankHistory = this.parseRankHistory(playerToken);
    let daysAgo = 0;

    for (let i = playerRankHistory.length - daysAgo; i >= 0; i--) {
      const rank = playerRankHistory[i];
      if (rank === this.INACTIVE_RANK) continue;

      const date = getMidnightAlignedDate(getDaysAgoDate(daysAgo));
      player.setStatisticHistory(date, { rank });
      daysAgo += 1;
    }

    player.markModified("statisticHistory");
    await player.save();
  }

  /**
   * Tracks and updates a player's statistics for a specific date.
   * This method handles both new and existing players, updating their statistics
   * and handling inactive status.
   *
   * @param foundPlayer - The player document to track
   * @param trackTime - The date to track statistics for
   * @param playerToken - Optional ScoreSaber player token. If not provided, will be fetched
   * @throws {Error} If the player cannot be found on ScoreSaber
   */
  public static async trackScoreSaberPlayer(
    foundPlayer: PlayerDocument,
    trackTime: Date,
    playerToken?: ScoreSaberPlayerToken
  ): Promise<void> {
    const before = performance.now();
    const player = playerToken ?? (await scoresaberService.lookupPlayer(foundPlayer.id));

    if (!player) {
      Logger.warn(`Player "${foundPlayer.id}" not found on ScoreSaber`);
      return;
    }

    await this.updatePlayerInactiveStatus(foundPlayer, player);
    if (player.inactive) {
      Logger.info(`Player "${foundPlayer.id}" is inactive on ScoreSaber`);
      return;
    }

    if (foundPlayer.getDaysTracked() === 0) {
      await this.seedPlayerHistory(foundPlayer, player);
    }

    if (foundPlayer.seededScores) {
      await this.updatePlayerStatistics(foundPlayer, player, trackTime);
    }

    foundPlayer.lastTracked = new Date();
    await foundPlayer.save();

    Logger.info(
      `Tracked player "${foundPlayer.id}" in ${(performance.now() - before).toFixed(0)}ms`
    );
  }

  /**
   * Retrieves a player's statistic history within a specified date range.
   * Combines data from both local storage and ScoreSaber API.
   *
   * @param player - The ScoreSaber player token
   * @param account - Optional player document from local storage
   * @param accuracies - Player accuracy statistics
   * @param startDate - Start date of the history range
   * @param endDate - End date of the history range
   * @returns Promise resolving to the player's statistic history
   */
  public static async getPlayerStatisticHistory(
    player: ScoreSaberPlayerToken,
    account: PlayerDocument | undefined,
    accuracies: PlayerAccuracies,
    startDate: Date,
    endDate: Date
  ): Promise<PlayerStatisticHistory> {
    let history = account?.getStatisticHistoryInRange(endDate, startDate) ?? {};
    history = await this.updateCurrentDayHistory(history, player, account, accuracies);
    history = this.mergeRankHistory(history, player, startDate, endDate);
    history = this.sortAndRoundHistory(history, account);

    return history;
  }

  /**
   * Updates a player's score count for the current day.
   * Increments either ranked or unranked score count based on the leaderboard stars.
   *
   * @param scoreToken - The ScoreSaber player score token
   * @param leaderboardToken - The ScoreSaber leaderboard token
   * @throws {Error} If the player document cannot be saved
   */
  public static async updatePlayerScoresSet({
    score: scoreToken,
    leaderboard: leaderboardToken,
  }: ScoreSaberPlayerScoreToken): Promise<void> {
    const playerId = scoreToken.leaderboardPlayerInfo.id;
    const player = await PlayerModel.findById(playerId);

    if (!player) return;

    const leaderboard = getScoreSaberLeaderboardFromToken(leaderboardToken);
    const today = new Date();
    const history = player.getHistoryByDate(today);
    const scores = history.scores ?? { rankedScores: 0, unrankedScores: 0 };

    if (leaderboard.stars > 0) {
      scores.rankedScores!++;
    } else {
      scores.unrankedScores!++;
    }

    history.scores = scores;
    player.setStatisticHistory(today, history);
    player.markModified("statisticHistory");
    await player.save();
  }

  /**
   * Retrieves a player's score calendar for a specific year and month.
   * Returns daily score statistics and metadata about available months.
   *
   * @param id - The player's ID
   * @param year - The year to get calendar data for
   * @param month - The month to get calendar data for (1-12)
   * @returns Promise resolving to the score calendar data
   * @throws {NotFoundError} If the player is not found
   */
  public static async getScoreCalendar(
    id: string,
    year: number,
    month: number
  ): Promise<ScoreCalendarData> {
    const player = await PlayerModel.findById(id);
    if (!player) {
      throw new NotFoundError(`Player "${id}" not found`);
    }

    return fetchWithCache(
      CacheService.getCache(ServiceCache.ScoreCalendar),
      `score-calendar:${id}-${year}-${month}`,
      () => this.generateScoreCalendar(player, year, month)
    );
  }

  /**
   * Parses a player's rank history from their ScoreSaber token.
   *
   * @param playerToken - The ScoreSaber player token
   * @returns Array of rank numbers
   */
  private static parseRankHistory(playerToken: ScoreSaberPlayerToken): number[] {
    return [...playerToken.histories.split(",").map(Number), playerToken.rank];
  }

  /**
   * Updates a player's inactive status based on ScoreSaber data.
   *
   * @param foundPlayer - The player document to update
   * @param player - The ScoreSaber player token
   * @throws {Error} If the player document cannot be saved
   */
  private static async updatePlayerInactiveStatus(
    foundPlayer: PlayerDocument,
    player: ScoreSaberPlayerToken
  ): Promise<void> {
    if (foundPlayer.inactive !== player.inactive) {
      foundPlayer.inactive = player.inactive;
      await foundPlayer.save();
    }
  }

  /**
   * Updates a player's statistics for a specific date.
   *
   * @param player - The player document to update
   * @param playerToken - The ScoreSaber player token
   * @param trackTime - The date to update statistics for
   * @throws {Error} If the player document cannot be saved
   */
  private static async updatePlayerStatistics(
    player: PlayerDocument,
    playerToken: ScoreSaberPlayerToken,
    trackTime: Date
  ): Promise<void> {
    const history = player.getHistoryByDate(trackTime) ?? {};
    const accuracies = await PlayerAccuracyService.getPlayerAverageAccuracies(player.id);

    const updatedHistory: PlayerStatistic = {
      ...history,
      pp: playerToken.pp,
      plusOnePp: (await PlayerRankingService.getPlayerPpBoundary(player.id, 1))[0],
      countryRank: playerToken.countryRank,
      rank: playerToken.rank,
      accuracy: {
        ...history.accuracy,
        averageRankedAccuracy: playerToken.scoreStats.averageRankedAccuracy,
        averageUnrankedAccuracy: accuracies.unrankedAccuracy,
        averageAccuracy: accuracies.averageAccuracy,
      },
      scores: {
        rankedScores: 0,
        unrankedScores: 0,
        ...history.scores,
        totalScores: playerToken.scoreStats.totalPlayCount,
        totalRankedScores: playerToken.scoreStats.rankedPlayCount,
      },
      score: {
        ...history.score,
        totalScore: playerToken.scoreStats.totalScore,
        totalRankedScore: playerToken.scoreStats.totalRankedScore,
      },
    };

    player.setStatisticHistory(trackTime, updatedHistory);
    player.sortStatisticHistory();
    player.markModified("statisticHistory");
  }

  /**
   * Updates the current day's history with latest data from ScoreSaber.
   *
   * @param history - The existing history object
   * @param player - The ScoreSaber player token
   * @param account - Optional player document
   * @param accuracies - Player accuracy statistics
   * @returns Updated history object
   */
  private static async updateCurrentDayHistory(
    history: PlayerStatisticHistory,
    player: ScoreSaberPlayerToken,
    account: PlayerDocument | undefined,
    accuracies: PlayerAccuracies
  ): Promise<PlayerStatisticHistory> {
    const todayDate = formatDateMinimal(getMidnightAlignedDate(new Date()));
    const historyElement = history[todayDate];

    if (!history) return history;

    history[todayDate] = {
      ...historyElement,
      rank: player.rank,
      ...(account && {
        countryRank: player.countryRank,
        ...(account.seededScores && {
          plusOnePp: (await PlayerRankingService.getPlayerPpBoundary(account.id, 1))[0],
        }),
        replaysWatched: player.scoreStats.replaysWatched,
        accuracy: {
          ...historyElement?.accuracy,
          averageRankedAccuracy: player.scoreStats.averageRankedAccuracy,
          averageUnrankedAccuracy: accuracies.unrankedAccuracy,
          averageAccuracy: accuracies.averageAccuracy,
        },
        scores: {
          rankedScores: 0,
          unrankedScores: 0,
          ...historyElement?.scores,
          totalScores: player.scoreStats.totalPlayCount,
          totalRankedScores: player.scoreStats.rankedPlayCount,
        },
        score: {
          ...historyElement?.score,
          totalScore: player.scoreStats.totalScore,
          totalRankedScore: player.scoreStats.totalRankedScore,
        },
      }),
    };

    return history;
  }

  /**
   * Merges rank history from ScoreSaber with existing history.
   *
   * @param history - The existing history object
   * @param player - The ScoreSaber player token
   * @param startDate - Start date of the history range
   * @param endDate - End date of the history range
   * @returns Updated history object
   */
  private static mergeRankHistory(
    history: PlayerStatisticHistory,
    player: ScoreSaberPlayerToken,
    startDate: Date,
    endDate: Date
  ): PlayerStatisticHistory {
    const playerRankHistory = this.parseRankHistory(player);
    const daysDiff = Math.ceil((startDate.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
    let daysAgo = 0;

    for (
      let i = playerRankHistory.length - 1;
      i >= Math.max(0, playerRankHistory.length - daysDiff - 1);
      i--
    ) {
      const rank = playerRankHistory[i];
      if (rank === this.INACTIVE_RANK) continue;

      const date = getMidnightAlignedDate(getDaysAgoDate(daysAgo));
      daysAgo += 1;

      const dateKey = formatDateMinimal(date);
      if (!history[dateKey] || history[dateKey].rank === undefined) {
        history[dateKey] = { rank };
      }
    }

    return history;
  }

  /**
   * Sorts history by date and rounds plusOnePp values.
   *
   * @param history - The history object to sort
   * @param account - Optional player document
   * @returns Sorted and rounded history object
   */
  private static sortAndRoundHistory(
    history: PlayerStatisticHistory,
    account: PlayerDocument | undefined
  ): PlayerStatisticHistory {
    const sortedHistory = Object.fromEntries(
      Object.entries(history).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
    );

    if (account) {
      for (const [date, statistic] of Object.entries(sortedHistory)) {
        if (statistic.plusOnePp) {
          statistic.plusOnePp = Math.round(statistic.plusOnePp * 100) / 100;
          sortedHistory[date] = statistic;
        }
      }
    }

    return sortedHistory;
  }

  /**
   * Validates if a statistic object has valid score data.
   *
   * @param stat - The statistic object to validate
   * @returns True if the statistic has valid score data
   */
  private static isValidStatistic(stat: PlayerStatistic | undefined): boolean {
    return (
      stat?.scores?.rankedScores !== undefined &&
      stat?.scores?.unrankedScores !== undefined &&
      typeof stat.scores.rankedScores === "number" &&
      typeof stat.scores.unrankedScores === "number"
    );
  }

  /**
   * Generates score calendar data for a specific year and month.
   *
   * @param player - The player document
   * @param year - The year to generate calendar for
   * @param month - The month to generate calendar for
   * @returns Score calendar data
   */
  private static async generateScoreCalendar(
    player: PlayerDocument,
    year: number,
    month: number
  ): Promise<ScoreCalendarData> {
    const history = player.getStatisticHistory();
    const days: Record<number, { rankedMaps: number; unrankedMaps: number; totalMaps: number }> =
      {};
    const metadata: Record<number, number[]> = {};

    for (const [dateStr, stat] of Object.entries(history)) {
      const date = new Date(dateStr);
      const statYear = date.getFullYear();
      const statMonth = date.getMonth() + 1;

      if (!this.isValidStatistic(stat)) continue;

      this.updateMetadata(metadata, statYear, statMonth);

      if (statYear === year && statMonth === month && stat.scores) {
        const rankedScores = stat.scores.rankedScores ?? 0;
        const unrankedScores = stat.scores.unrankedScores ?? 0;

        days[date.getDate()] = {
          rankedMaps: rankedScores,
          unrankedMaps: unrankedScores,
          totalMaps: rankedScores + unrankedScores,
        };
      }
    }

    this.sortMetadata(metadata);

    return { days, metadata };
  }

  /**
   * Updates metadata with year and month information.
   *
   * @param metadata - The metadata object to update
   * @param year - The year to add
   * @param month - The month to add
   */
  private static updateMetadata(
    metadata: Record<number, number[]>,
    year: number,
    month: number
  ): void {
    if (!metadata[year]) {
      metadata[year] = [];
    }
    if (!metadata[year].includes(month)) {
      metadata[year].push(month);
    }
  }

  /**
   * Sorts months in metadata for each year.
   *
   * @param metadata - The metadata object to sort
   */
  private static sortMetadata(metadata: Record<number, number[]>): void {
    for (const [year, months] of Object.entries(metadata)) {
      metadata[Number(year)] = months.sort();
    }
  }
}
