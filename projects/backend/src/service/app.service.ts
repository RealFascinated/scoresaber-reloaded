import { PlayerModel } from "@ssr/common/model/player";
import { AppStatistics } from "@ssr/common/types/backend/app-statistics";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { AdditionalScoreDataModel } from "@ssr/common/model/additional-score-data/additional-score-data";
import { BeatSaverMapModel } from "@ssr/common/model/beatsaver/map";
import { ScoreSaberLeaderboardModel } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { fetchWithCache } from "../common/cache.util";
import CacheService, { ServiceCache } from "./cache.service";
import { ScoreStatsModel } from "@ssr/common/model/score-stats/score-stats";

export class AppService {
  /**
   * Gets the app statistics.
   */
  public static async getAppStatistics(): Promise<AppStatistics> {
    return fetchWithCache(CacheService.getCache(ServiceCache.AppStatistics), "stats", async () => {
      const trackedPlayers = await PlayerModel.estimatedDocumentCount();
      const trackedScores = await ScoreSaberScoreModel.estimatedDocumentCount();
      const additionalScoresData = await AdditionalScoreDataModel.estimatedDocumentCount();
      const cachedBeatSaverMaps = await BeatSaverMapModel.estimatedDocumentCount();
      const cachedScoreSaberLeaderboards = await ScoreSaberLeaderboardModel.estimatedDocumentCount();
      const cachedBeatLeaderScoreStats = await ScoreStatsModel.estimatedDocumentCount();

      return {
        trackedPlayers,
        trackedScores,
        additionalScoresData,
        cachedBeatSaverMaps,
        cachedScoreSaberLeaderboards,
        cachedBeatLeaderScoreStats,
      } as AppStatistics;
    });
  }
}
