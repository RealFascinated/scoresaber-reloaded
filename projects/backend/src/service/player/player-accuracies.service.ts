import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { PlayerAccuracies } from "@ssr/common/player/player-accuracies";

export class PlayerAccuraciesService {
  /**
   * Gets the player's average accuracies.
   *
   * @param playerId the player's id
   * @returns the player's accuracy
   */
  public static async getPlayerAverageAccuracies(playerId: string): Promise<PlayerAccuracies> {
    const accuracies = {
      unrankedAccuracy: 0,
      averageAccuracy: 0,
    };

    const result = await ScoreSaberScoreModel.aggregate([
      {
        $match: {
          playerId: playerId,
          accuracy: { $gte: 0, $lte: 100 },
        },
      },
      {
        $facet: {
          totalStats: [
            {
              $group: {
                _id: null,
                totalAccuracy: { $sum: "$accuracy" },
                count: { $sum: 1 },
              },
            },
          ],
          unrankedStats: [
            {
              $match: { pp: 0 },
            },
            {
              $group: {
                _id: null,
                totalAccuracy: { $sum: "$accuracy" },
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    if (result.length > 0) {
      const { totalStats, unrankedStats } = result[0];

      // Calculate total average accuracy
      if (totalStats.length > 0) {
        accuracies.averageAccuracy = totalStats[0].totalAccuracy / totalStats[0].count;
      }

      // Calculate unranked average accuracy
      if (unrankedStats.length > 0) {
        accuracies.unrankedAccuracy = unrankedStats[0].totalAccuracy / unrankedStats[0].count;
      }
    }

    return accuracies;
  }
}
