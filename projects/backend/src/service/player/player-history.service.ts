import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
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

    const isRangeIncludesToday = isToday(startDate) || isToday(endDate);

    // Ensure start date is before end date
    const [queryStart, queryEnd] =
      startTimestamp > endTimestamp
        ? [endTimestamp, startTimestamp]
        : [startTimestamp, endTimestamp];

    // Run queries in parallel
    const [entries, playerRankHistory, todayData] = await Promise.all([
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
      isRangeIncludesToday ? this.createPlayerStatistic(player, undefined) : undefined,
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

    // Add today's data if the range includes today
    const today = getMidnightAlignedDate(new Date());
    const todayKey = formatDateMinimal(today);
    if (todayData && isRangeIncludesToday) {
      history[todayKey] = todayData;
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
}
