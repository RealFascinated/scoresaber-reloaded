import { AdditionalScoreDataModel } from "@ssr/common/model/additional-score-data/additional-score-data";
import { PlayerModel } from "@ssr/common/model/player/player";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { AppStatistics } from "@ssr/common/types/backend/app-statistics";

export class AppService {
  /**
   * Gets the app statistics.
   */
  public static async getAppStatistics(): Promise<AppStatistics> {
    const [trackedPlayers, trackedScores, storedReplays, inactivePlayers, activePlayers] =
      await Promise.all([
        PlayerModel.estimatedDocumentCount(),
        ScoreSaberScoreModel.estimatedDocumentCount(),
        AdditionalScoreDataModel.countDocuments({
          savedReplay: true,
        }),
        PlayerModel.countDocuments({
          inactive: true,
        }),

        PlayerModel.countDocuments({
          inactive: false,
        }),
      ]);

    return {
      trackedPlayers,
      trackedScores,
      storedReplays,
      inactivePlayers,
      activePlayers,
    } as AppStatistics;
  }
}
