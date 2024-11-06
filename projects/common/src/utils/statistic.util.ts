import { kyFetchJson } from "./utils";
import { Config } from "../config";
import { GamePlatform } from "../model/statistics/game-platform";
import { StatisticsType } from "../model/statistics/statistic-type";

/**
 * Gets statistics for a platform.
 *
 * @param platform the platform to get statistics for
 */
export async function getPlatformStatistics(platform: GamePlatform) {
  return await kyFetchJson<{ statistics: StatisticsType }>(`${Config.apiUrl}/statistics/${platform}`);
}
