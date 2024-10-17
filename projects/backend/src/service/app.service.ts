import { PlayerModel } from "@ssr/common/model/player";
import { AppStatistics } from "@ssr/common/types/backend/app-statistics";

export class AppService {
  /**
   * Gets the app statistics.
   */
  public static async getAppStatistics(): Promise<AppStatistics> {
    const trackedPlayers = await PlayerModel.countDocuments();

    return {
      trackedPlayers,
    };
  }
}
