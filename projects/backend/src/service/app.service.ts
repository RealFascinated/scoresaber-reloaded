import { PlayerModel } from "@ssr/common/model/player";
import { AppStatistics } from "@ssr/common/types/backend/app-statistics";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { AdditionalScoreDataModel } from "@ssr/common/model/additional-score-data/additional-score-data";
import { BeatSaverMapModel } from "@ssr/common/model/beatsaver/map";

export class AppService {
  /**
   * Gets the app statistics.
   */
  public static async getAppStatistics(): Promise<AppStatistics> {
    const trackedPlayers = await PlayerModel.countDocuments();
    const trackedScores = await ScoreSaberScoreModel.countDocuments();
    const additionalScoresData = await AdditionalScoreDataModel.countDocuments();
    const cachedBeatSaverMaps = await BeatSaverMapModel.countDocuments();

    return {
      trackedPlayers,
      trackedScores,
      additionalScoresData,
      cachedBeatSaverMaps,
    };
  }
}
