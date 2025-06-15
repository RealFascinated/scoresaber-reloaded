import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger from "@ssr/common/logger";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { PlayerDocument, PlayerModel } from "@ssr/common/model/player";
import {
  PlayerHistoryEntry,
  PlayerHistoryEntryModel,
} from "@ssr/common/model/player/player-history-entry";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { removeObjectFields } from "@ssr/common/object.util";
import { PlayerStatisticHistory } from "@ssr/common/player/player-statistic-history";
import { ScoreCalendarData } from "@ssr/common/types/player/player-statistic";
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
    const player =
      playerToken ??
      (await ApiServiceRegistry.getInstance().getScoreSaberService().lookupPlayer(foundPlayer.id));

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

    const daysTracked = await foundPlayer.getDaysTracked();
    if (daysTracked === 0) {
      await this.seedPlayerHistory(foundPlayer, player);
    }

    if (foundPlayer.seededScores) {
      const existingEntry = await PlayerHistoryEntryModel.findOne({
        playerId: foundPlayer.id,
        date: getMidnightAlignedDate(trackTime),
      }).lean();

      const updatedHistory = await this.createPlayerStatistic(player, existingEntry ?? undefined);

      await PlayerHistoryEntryModel.findOneAndUpdate(
        { playerId: foundPlayer.id, date: getMidnightAlignedDate(trackTime) },
        updatedHistory,
        { upsert: true }
      );
    }

    foundPlayer.lastTracked = new Date();
    await foundPlayer.save();

    Logger.info(
      `Tracked player "${foundPlayer.id}" in ${(performance.now() - before).toFixed(0)}ms`
    );
  }

  /**
   * Gets a player's statistic history for a specific date range.
   */
  public static async getPlayerStatisticHistory(
    player: ScoreSaberPlayerToken,
    startDate: Date,
    endDate: Date
  ): Promise<PlayerStatisticHistory> {
    const startTimestamp = getMidnightAlignedDate(startDate).getTime();
    const endTimestamp = getMidnightAlignedDate(endDate).getTime();

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
        .lean(),
      parseRankHistory(player),
    ]);

    const history: PlayerStatisticHistory = {};
    for (const entry of entries) {
      const date = formatDateMinimal(entry.date);
      history[date] = this.playerHistoryToObject(entry);
    }

    // Merge rank history
    const daysDiff = Math.ceil((startDate.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
    let daysAgo = 0;

    for (
      let i = playerRankHistory.length - 1;
      i >= Math.max(0, playerRankHistory.length - daysDiff - 1);
      i--
    ) {
      const rank = playerRankHistory[i];
      if (rank === this.INACTIVE_RANK || rank === 0) continue;

      const date = getMidnightAlignedDate(getDaysAgoDate(daysAgo));
      daysAgo += 1;

      const dateKey = formatDateMinimal(date);
      if (!history[dateKey] || history[dateKey].rank === undefined) {
        history[dateKey] = { rank };
      }
    }

    // Add todays data
    const today = getMidnightAlignedDate(new Date());
    const todayKey = formatDateMinimal(today);
    history[todayKey] = await this.createPlayerStatistic(player, history[todayKey]);

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
      if (rank === this.INACTIVE_RANK || rank === 0) continue;

      const date = getMidnightAlignedDate(getDaysAgoDate(daysAgo));
      await PlayerHistoryEntryModel.findOneAndUpdate(
        { playerId: player.id, date },
        { rank },
        { upsert: true }
      );
      daysAgo += 1;
    }
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

    const today = getMidnightAlignedDate(new Date());
    const existingEntry = await PlayerHistoryEntryModel.findOne({
      playerId: score.playerId,
      date: today,
    }).lean();

    const update: Partial<PlayerHistoryEntry> = {
      playerId: score.playerId,
      date: today,
    };

    if (leaderboard.stars > 0) {
      update.rankedScores = (existingEntry?.rankedScores ?? 0) + 1;
    } else {
      update.unrankedScores = (existingEntry?.unrankedScores ?? 0) + 1;
    }

    await PlayerHistoryEntryModel.findOneAndUpdate(
      { playerId: score.playerId, date: today },
      update,
      { upsert: true, new: true }
    );
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
    existingEntry?: Partial<PlayerHistoryEntry>
  ): Promise<Partial<PlayerHistoryEntry>> {
    const [accuracies, plusOnePp] = await Promise.all([
      PlayerAccuracyService.getPlayerAverageAccuracies(playerToken.id),
      PlayerRankingService.getPlayerPpBoundary(playerToken.id, 1),
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
      totalScores: playerToken.scoreStats.totalPlayCount,
      totalRankedScores: playerToken.scoreStats.rankedPlayCount,
      totalScore: playerToken.scoreStats.totalScore,
      totalRankedScore: playerToken.scoreStats.totalRankedScore,
      plusOnePp: plusOnePp[0],
    };
  }

  /**
   * Generates score calendar data for a specific year and month.
   */
  private static async generateScoreCalendar(
    player: PlayerDocument,
    year: number,
    month: number
  ): Promise<ScoreCalendarData> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const entries = await PlayerHistoryEntryModel.find({
      playerId: player.id,
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    });

    const days: Record<number, { rankedMaps: number; unrankedMaps: number; totalMaps: number }> =
      {};
    const metadata: Record<number, number[]> = {};

    for (const entry of entries) {
      const date = entry.date;
      const statYear = date.getFullYear();
      const statMonth = date.getMonth() + 1;

      if (
        !entry.rankedScores ||
        !entry.unrankedScores ||
        typeof entry.rankedScores !== "number" ||
        typeof entry.unrankedScores !== "number"
      ) {
        continue;
      }

      if (!metadata[statYear]) {
        metadata[statYear] = [];
      }
      if (!metadata[statYear].includes(statMonth)) {
        metadata[statYear].push(statMonth);
      }

      if (statYear === year && statMonth === month) {
        const rankedScores = entry.rankedScores ?? 0;
        const unrankedScores = entry.unrankedScores ?? 0;

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

  /**
   * Converts a database additional score data to a AdditionalScoreData.
   *
   * @param additionalData the additional score data to convert
   * @returns the converted additional score data
   * @private
   */
  private static playerHistoryToObject(history: PlayerHistoryEntry): PlayerHistoryEntry {
    return {
      ...removeObjectFields<PlayerHistoryEntry>(history, ["_id", "__v", "playerId", "date"]),
    } as PlayerHistoryEntry;
  }
}
