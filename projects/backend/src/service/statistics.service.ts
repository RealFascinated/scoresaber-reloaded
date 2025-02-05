import { formatDateMinimal, getMidnightAlignedDate } from "@ssr/common/utils/time-utils";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { GamePlatform } from "@ssr/common/model/statistics/game-platform";
import { Statistic } from "@ssr/common/model/statistics/statistic";
import { StatisticsModel } from "@ssr/common/model/statistics/statistics";
import Logger from "@ssr/common/logger";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";

export default class StatisticsService {
  constructor() {
    for (const platform of Object.values(GamePlatform)) {
      StatisticsService.initPlatform(platform);
    }
  }

  /**
   * Initializes the platform and returns it.
   *
   * @param platform the platform to initialize
   * @returns the initialized platform, or undefined if it already exists
   */
  public static async initPlatform(platform: GamePlatform) {
    if (await StatisticsModel.exists({ _id: platform })) {
      return;
    }
    const statistics = new StatisticsModel({
      _id: platform,
      statistics: new Map(),
    });
    await statistics.save();
    return statistics;
  }

  /**
   * Gets the statistics for a platform.
   *
   * @param platform the platform to get the statistics for
   * @returns the statistics
   */
  public static async getPlatform(platform: GamePlatform) {
    if (!Object.values(GamePlatform).includes(platform)) {
      throw new Error(`Invalid platform: ${platform}`);
    }

    const foundPlatform = await StatisticsModel.findById(platform);
    if (!foundPlatform) {
      return this.initPlatform(platform);
    }

    return foundPlatform;
  }

  /**
   * Tracks a statistic for a platform.
   *
   * @param platform the platform to track on
   * @param statistic the statistic to track
   * @param value the value to track
   */
  public static async trackStatisticToday(
    platform: GamePlatform,
    statistic: Statistic,
    value: number
  ) {
    const foundPlatform = await this.getPlatform(platform);
    if (!foundPlatform) {
      throw new Error(`Platform ${platform} not found`);
    }
    const date = formatDateMinimal(getMidnightAlignedDate(new Date()));

    foundPlatform.statistics[date] = {
      ...foundPlatform.statistics[date],
      [statistic]: value,
    };

    foundPlatform.markModified("statistics");
    await foundPlatform.save();
    Logger.info(`Successfully tracked ${statistic}: ${value} for ${platform} on ${date}`);
  }

  public static async getScoreSaberStatistics() {
    const statsResponse = await ScoreSaberScoreModel.aggregate([
      { $match: { timestamp: { $gte: getMidnightAlignedDate(new Date()) } } },
      {
        $facet: {
          uniquePlayers: [{ $group: { _id: "$playerId" } }, { $count: "uniquePlayers" }],
          totalScores: [{ $count: "totalScores" }],
        },
      },
    ]);

    const scores = await ScoreSaberScoreModel.find({
      timestamp: { $gte: getMidnightAlignedDate(new Date()) },
      pp: { $gt: 0 },
    })
      .select({ pp: 1 }) // Use .select() instead of .projection()
      .sort({ pp: -1 }) // Sort before limiting
      .limit(100) // Limit the results
      .lean(); // Convert to plain JavaScript objects

    const playerCount = await scoresaberService.lookupActivePlayerCount();

    return {
      uniquePlayers: statsResponse[0]?.uniquePlayers[0]?.uniquePlayers || 0,
      playerCount: playerCount || 0,
      totalScores: statsResponse[0]?.totalScores[0]?.totalScores || 0,
      averagePp: scores.reduce((total, score) => total + score.pp, 0) / scores.length,
    };
  }

  /**
   * Tracks the statistics for ScoreSaber.
   */
  public static async trackScoreSaberStatistics() {
    const { uniquePlayers, playerCount, totalScores, averagePp } =
      await this.getScoreSaberStatistics();

    await this.trackStatisticToday(GamePlatform.ScoreSaber, Statistic.ActivePlayers, uniquePlayers);
    await this.trackStatisticToday(GamePlatform.ScoreSaber, Statistic.PlayerCount, playerCount);
    await this.trackStatisticToday(GamePlatform.ScoreSaber, Statistic.TotalScores, totalScores);
    await this.trackStatisticToday(GamePlatform.ScoreSaber, Statistic.AveragePp, averagePp);
  }
}
