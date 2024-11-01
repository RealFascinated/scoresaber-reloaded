import { PlayerModel } from "@ssr/common/model/player";
import { AppStatistics } from "@ssr/common/types/backend/app-statistics";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { AdditionalScoreDataModel } from "@ssr/common/model/additional-score-data/additional-score-data";
import { BeatSaverMapModel } from "@ssr/common/model/beatsaver/map";
import { ScoreSaberLeaderboardModel } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { SSRCache } from "@ssr/common/cache";
import { fetchWithCache } from "../common/cache.util";

const statisticsCache = new SSRCache({
  ttl: 120 * 1000, // 2 minutes
});

export class AppService {
  /**
   * Gets the app statistics.
   */
  public static async getAppStatistics(): Promise<AppStatistics> {
    return fetchWithCache(statisticsCache, "stats", async () => {
      const trackedPlayers = await PlayerModel.countDocuments();
      const trackedScores = await ScoreSaberScoreModel.countDocuments();
      const additionalScoresData = await AdditionalScoreDataModel.countDocuments();
      const cachedBeatSaverMaps = await BeatSaverMapModel.countDocuments();
      const cachedScoreSaberLeaderboards = await ScoreSaberLeaderboardModel.countDocuments();
      const cachedBeatLeaderScoreStats = await AdditionalScoreDataModel.countDocuments({ cachedScoreStats: true });

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
