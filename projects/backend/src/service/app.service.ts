import { AdditionalScoreDataModel } from "@ssr/common/model/beatleader-score/beatleader-score";
import { ScoreSaberLeaderboardModel } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { PlayerModel } from "@ssr/common/model/player/player";
import { ScoreSaberPreviousScoreModel } from "@ssr/common/model/score/impl/scoresaber-previous-score";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { AppStatisticsResponse } from "@ssr/common/schemas/response/ssr/app-statistics";
import MetricsService, { MetricType } from "./metrics.service";

export class AppService {
  /**
   * Gets the app statistics.
   */
  public static async getAppStatistics(): Promise<AppStatisticsResponse> {
    const [
      trackedScores,
      scoreHistoryScores,
      storedReplays,
      inactivePlayers,
      activePlayers,
      leaderboardCount,
    ] = await Promise.all([
      ScoreSaberScoreModel.estimatedDocumentCount(),
      ScoreSaberPreviousScoreModel.estimatedDocumentCount(),
      AdditionalScoreDataModel.countDocuments({
        savedReplay: true,
      }),
      PlayerModel.countDocuments({
        inactive: true,
      }),
      ((await MetricsService.getMetric(MetricType.ACTIVE_ACCOUNTS))?.value as number) || 0,
      ScoreSaberLeaderboardModel.estimatedDocumentCount(),
    ]);

    return {
      leaderboardCount,
      trackedScores,
      scoreHistoryScores,
      storedReplays,
      inactivePlayers,
      activePlayers,
    };
  }
}
