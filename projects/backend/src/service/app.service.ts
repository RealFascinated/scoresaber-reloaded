import { AdditionalScoreDataModel } from "@ssr/common/model/additional-score-data/additional-score-data";
import { PlayerModel } from "@ssr/common/model/player/player";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { AppStatistics } from "@ssr/common/types/backend/app-statistics";

export class AppService {
  /**
   * Gets the app statistics.
   */
  public static async getAppStatistics(): Promise<AppStatistics> {
    const trackedPlayers = await PlayerModel.estimatedDocumentCount();
    const trackedScores = await ScoreSaberScoreModel.estimatedDocumentCount();
    const storedReplays = await AdditionalScoreDataModel.countDocuments({
      savedReplay: true,
    });
    const inactivePlayers = await PlayerModel.countDocuments({
      inactive: true,
    });

    return {
      trackedPlayers,
      trackedScores,
      storedReplays,
      inactivePlayers,
    } as AppStatistics;
  }
}
