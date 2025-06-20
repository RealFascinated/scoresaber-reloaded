import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import Logger from "@ssr/common/logger";
import { Player, PlayerModel } from "@ssr/common/model/player";
import {
  PlayerHistoryEntry,
  PlayerHistoryEntryModel,
} from "@ssr/common/model/player/player-history-entry";
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
import { PlayerService } from "./player.service";

export class PlayerHistoryService {
  private static readonly INACTIVE_RANK = 999_999;

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
      history[date] = this.playerHistoryToObject(entry);
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
      if (rank === this.INACTIVE_RANK || rank === 0) continue;

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
      const todayData = await this.getTodayPlayerStatistic(player, todayKey, projection);
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
    todayKey: string,
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
      if (rank === this.INACTIVE_RANK || rank === 0) continue;

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
