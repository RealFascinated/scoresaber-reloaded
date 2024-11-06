import { formatDateMinimal, getDaysAgoDate, getMidnightAlignedDate } from "@ssr/common/utils/time-utils";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { Statistic, StatisticsModel } from "@ssr/common/model/statistics";
import { GamePlatform } from "@ssr/common/model/statistics/game-platform";

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
    if (!(platform in GamePlatform)) {
      throw new Error(`Platform ${platform} not found`);
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
  public static async trackStatisticToday(platform: GamePlatform, statistic: Statistic, value: number) {
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
    console.log(`Successfully tracked ${statistic}: ${value} for ${platform} on ${date}`);
  }

  /**
   * Tracks the statistics for ScoreSaber.
   */
  public static async trackScoreSaberStatistics() {
    const statsResponse = await ScoreSaberScoreModel.aggregate([
      { $match: { timestamp: { $gte: getDaysAgoDate(1) } } },
      {
        $facet: {
          uniquePlayers: [{ $group: { _id: "$playerId" } }, { $count: "uniquePlayers" }],
          totalScores: [{ $count: "totalScores" }],
        },
      },
    ]);
    const uniquePlayers = statsResponse[0]?.uniquePlayers[0]?.uniquePlayers || 0;
    const totalScores = statsResponse[0]?.totalScores[0]?.totalScores || 0;

    await Promise.all([
      this.trackStatisticToday(GamePlatform.ScoreSaber, Statistic.ActivePlayers, uniquePlayers),
      this.trackStatisticToday(GamePlatform.ScoreSaber, Statistic.TotalScores, totalScores),
    ]);
  }
}
