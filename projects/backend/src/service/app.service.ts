import { AdditionalScoreDataModel } from "@ssr/common/model/additional-score-data/additional-score-data";
import { PlayerModel } from "@ssr/common/model/player/player";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { AppStatistics } from "@ssr/common/types/backend/app-statistics";
import { ScoreSaberPreviousScoreModel } from "@ssr/common/model/score/impl/scoresaber-previous-score";
import MetricsService, { MetricType } from "./metrics.service";

export class AppService {
  /**
   * Gets the app statistics.
   */
  public static async getAppStatistics(): Promise<AppStatistics> {
    const [
      trackedPlayers,
      trackedScores,
      scoreHistoryScores,
      storedReplays,
      inactivePlayers,
      activePlayers,
    ] = await Promise.all([
      PlayerModel.estimatedDocumentCount(),
      ScoreSaberScoreModel.estimatedDocumentCount(),
      ScoreSaberPreviousScoreModel.estimatedDocumentCount(),
      AdditionalScoreDataModel.countDocuments({
        savedReplay: true,
      }),
      PlayerModel.countDocuments({
        inactive: true,
      }),
      (await MetricsService.getMetric(MetricType.ACTIVE_ACCOUNTS)).value,
    ]);

    return {
      trackedPlayers,
      trackedScores,
      scoreHistoryScores,
      storedReplays,
      inactivePlayers,
      activePlayers,
    } as AppStatistics;
  }
}
