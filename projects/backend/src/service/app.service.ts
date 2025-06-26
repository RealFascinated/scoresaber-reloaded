import { AdditionalScoreDataModel } from "@ssr/common/model/additional-score-data/additional-score-data";
import { PlayerModel } from "@ssr/common/model/player/player";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { AppStatistics } from "@ssr/common/types/backend/app-statistics";
import CacheService, { CacheId } from "./cache.service";

export class AppService {
  /**
   * Gets the app statistics.
   */
  public static async getAppStatistics(): Promise<AppStatistics> {
    return CacheService.fetchWithCache(CacheId.AppStatistics, "stats", async () => {
      const trackedPlayers = await PlayerModel.estimatedDocumentCount();
      const trackedScores = await ScoreSaberScoreModel.estimatedDocumentCount();

      // Count stored replays from AdditionalScoreData collection
      const storedReplays = await AdditionalScoreDataModel.countDocuments({
        savedReplay: true,
      });

      // Count inactive players
      const inactivePlayers = await PlayerModel.countDocuments({
        inactive: true,
      });

      return {
        trackedPlayers,
        trackedScores,
        storedReplays,
        inactivePlayers,
      } as AppStatistics;
    });
  }
}
