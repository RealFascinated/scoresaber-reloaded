import { kyFetchJson } from "./utils";
import { StatisticsType } from "@ssr/model/statistics";
import { Config } from "../config";
import { GamePlatform } from "../model/statistics/game-platform";

/**
 * Gets statistics for a platform.
 *
 * @param platform the platform to get statistics for
 */
export async function getPlatformStatistics(platform: GamePlatform) {
  return await kyFetchJson<{ statistics: StatisticsType }>(`${Config.apiUrl}/statistics/${platform}`);
}
