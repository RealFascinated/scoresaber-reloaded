import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { AccBadges } from "@ssr/common/player/acc-badges";
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

  /**
   * Gets the acc badges for a player.
   *
   * @param playerId the player's id
   * @returns the acc badges
   */
  public static async getAccBadges(playerId: string): Promise<AccBadges> {
    const badges: AccBadges = {
      GOD: 0,
      SSPlus: 0,
      SS: 0,
      SPlus: 0,
      S: 0,
      A: 0,
    };

    const playerScores = await ScoreSaberScoreModel.find({
      playerId: playerId,
      pp: { $gt: 0 },
    })
      .select({
        accuracy: 1,
      })
      .lean();

    for (const playerScore of playerScores) {
      const accuracy = playerScore.accuracy;
      if (accuracy >= 98) badges.GOD++;
      if (accuracy >= 95) badges.SSPlus++;
      if (accuracy >= 90) badges.SS++;
      if (accuracy >= 85) badges.SPlus++;
      if (accuracy >= 80) badges.S++;
      if (accuracy >= 70) badges.A++;
    }
    return badges;
  }
}
