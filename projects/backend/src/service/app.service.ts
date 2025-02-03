import { PlayerModel } from "@ssr/common/model/player";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { AppStatistics } from "@ssr/common/types/backend/app-statistics";
import { fetchWithCache } from "../common/cache.util";
import CacheService, { ServiceCache } from "./cache.service";

export class AppService {
  /**
   * Gets the app statistics.
   */
  public static async getAppStatistics(): Promise<AppStatistics> {
    return fetchWithCache(CacheService.getCache(ServiceCache.AppStatistics), "stats", async () => {
      const trackedPlayers = await PlayerModel.estimatedDocumentCount();
      const trackedScores = await ScoreSaberScoreModel.estimatedDocumentCount();

      return {
        trackedPlayers,
        trackedScores,
      } as AppStatistics;
    });
  }
}
