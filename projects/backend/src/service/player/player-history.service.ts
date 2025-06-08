import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger from "@ssr/common/logger";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { PlayerDocument, PlayerModel } from "@ssr/common/model/player";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { PlayerAccuracies } from "@ssr/common/player/player-accuracies";
import { PlayerStatisticHistory } from "@ssr/common/player/player-statistic-history";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { PlayerStatistic, ScoreCalendarData } from "@ssr/common/types/player/player-statistic";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { parseRankHistory } from "@ssr/common/utils/player-utils";
import {
  formatDateMinimal,
  getDaysAgoDate,
  getMidnightAlignedDate,
} from "@ssr/common/utils/time-utils";
import { fetchWithCache } from "../../common/cache.util";
import CacheService, { ServiceCache } from "../cache.service";
import { PlayerAccuracyService } from "./player-accuracy.service";
import { PlayerCoreService } from "./player-core.service";
import { PlayerRankingService } from "./player-ranking.service";

export class PlayerHistoryService {
  private static readonly INACTIVE_RANK = 999_999;

  /**
   * Tracks and updates a player's statistics for a specific date.
   * This method handles both new and existing players, updating their statistics
   * and handling inactive status.
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

    if (foundPlayer.inactive !== player.inactive) {
      foundPlayer.inactive = player.inactive;
      await foundPlayer.save();
    }

    if (player.inactive) {
      Logger.info(`Player "${foundPlayer.id}" is inactive on ScoreSaber`);
      return;
    }

    if (foundPlayer.getDaysTracked() === 0) {
      await this.seedPlayerHistory(foundPlayer, player);
    }

    if (foundPlayer.seededScores) {
      const history = foundPlayer.getHistoryByDate(trackTime) ?? {};
      const accuracies = await PlayerAccuracyService.getPlayerAverageAccuracies(foundPlayer.id);

      const updatedHistory = await this.createPlayerStatistic(
        player,
        accuracies,
        history,
        foundPlayer.id
      );

      foundPlayer.setStatisticHistory(trackTime, updatedHistory);
      foundPlayer.sortStatisticHistory();
      foundPlayer.markModified("statisticHistory");
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
   */
  public static async getPlayerStatisticHistory(
    player: ScoreSaberPlayerToken,
    startDate: Date,
    endDate: Date
  ): Promise<PlayerStatisticHistory> {
    const [account, accuracies] = await Promise.all([
      PlayerCoreService.getPlayer(player.id, false, player).catch(() => undefined),
      PlayerAccuracyService.getPlayerAverageAccuracies(player.id),
    ]);

    const history = account?.getStatisticHistoryInRange(endDate, startDate) ?? {};

    // Update current day's history
    const todayDate = formatDateMinimal(getMidnightAlignedDate(new Date()));
    const historyElement = history[todayDate];
    const updatedStatistic = await this.createPlayerStatistic(
      player,
      accuracies,
      historyElement,
      account?.id
    );
    if (account) {
      updatedStatistic.replaysWatched = player.scoreStats.replaysWatched;
    }
    history[todayDate] = updatedStatistic;

    // Merge rank history
    const playerRankHistory = parseRankHistory(player);
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

    // Sort and round history
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
   * Seeds a player's history with data from ScoreSaber API.
   * This method populates the player's rank history from their ScoreSaber profile.
   */
  public static async seedPlayerHistory(
    player: PlayerDocument,
    playerToken: ScoreSaberPlayerToken
  ): Promise<void> {
    const playerRankHistory = parseRankHistory(playerToken);
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
   * Updates a player's score count for the current day.
   * Increments either ranked or unranked score count based on the leaderboard stars.
   */
  public static async updatePlayerScoresSet({
    score,
    leaderboard,
  }: {
    score: ScoreSaberScore;
    leaderboard: ScoreSaberLeaderboard;
  }): Promise<void> {
    const player = await PlayerModel.findById(score.playerId);

    if (!player) return;

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
   * Creates a new player statistic object from ScoreSaber data and existing history.
   */
  private static async createPlayerStatistic(
    playerToken: ScoreSaberPlayerToken,
    accuracies: PlayerAccuracies,
    existingHistory?: PlayerStatistic,
    playerId?: string
  ): Promise<PlayerStatistic> {
    const baseStatistic: PlayerStatistic = {
      pp: playerToken.pp,
      countryRank: playerToken.countryRank,
      rank: playerToken.rank,
      accuracy: {
        ...existingHistory?.accuracy,
        averageRankedAccuracy: playerToken.scoreStats.averageRankedAccuracy,
        averageUnrankedAccuracy: accuracies.unrankedAccuracy,
        averageAccuracy: accuracies.averageAccuracy,
      },
      scores: {
        rankedScores: 0,
        unrankedScores: 0,
        ...existingHistory?.scores,
        totalScores: playerToken.scoreStats.totalPlayCount,
        totalRankedScores: playerToken.scoreStats.rankedPlayCount,
      },
      score: {
        ...existingHistory?.score,
        totalScore: playerToken.scoreStats.totalScore,
        totalRankedScore: playerToken.scoreStats.totalRankedScore,
      },
    };

    if (playerId) {
      baseStatistic.plusOnePp = (await PlayerRankingService.getPlayerPpBoundary(playerId, 1))[0];
    }

    return baseStatistic;
  }

  /**
   * Generates score calendar data for a specific year and month.
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

      if (
        !stat?.scores?.rankedScores ||
        !stat?.scores?.unrankedScores ||
        typeof stat.scores.rankedScores !== "number" ||
        typeof stat.scores.unrankedScores !== "number"
      ) {
        continue;
      }

      if (!metadata[statYear]) {
        metadata[statYear] = [];
      }
      if (!metadata[statYear].includes(statMonth)) {
        metadata[statYear].push(statMonth);
      }

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

    // Sort months in metadata
    for (const [year, months] of Object.entries(metadata)) {
      metadata[Number(year)] = months.sort();
    }

    return { days, metadata };
  }
}
