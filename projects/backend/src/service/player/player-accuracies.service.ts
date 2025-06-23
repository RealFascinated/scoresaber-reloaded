import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { AccBadges } from "@ssr/common/player/acc-badges";
import { PlayerAccuracies } from "@ssr/common/player/player-accuracies";
import { ScoreService } from "../score.service";

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
      SSPlus: 0,
      SS: 0,
      SPlus: 0,
      S: 0,
      A: 0,
    };

    // Use aggregation to get only ranked scores with accuracy
    const playerScores = await ScoreService.getPlayerScores(playerId, {
      ranked: true,
      projection: {
        accuracy: 1,
      },
      includeLeaderboard: false,
    });

    // Process scores in parallel using Promise.all
    const badgeCounts = await Promise.all(
      playerScores.map(async playerScore => {
        const accuracy = playerScore.score.accuracy;
        if (accuracy >= 95) return { SSPlus: 1, SS: 0, SPlus: 0, S: 0, A: 0 };
        if (accuracy >= 90) return { SSPlus: 0, SS: 1, SPlus: 0, S: 0, A: 0 };
        if (accuracy >= 85) return { SSPlus: 0, SS: 0, SPlus: 1, S: 0, A: 0 };
        if (accuracy >= 80) return { SSPlus: 0, SS: 0, SPlus: 0, S: 1, A: 0 };
        if (accuracy >= 70) return { SSPlus: 0, SS: 0, SPlus: 0, S: 0, A: 1 };
        return { SSPlus: 0, SS: 0, SPlus: 0, S: 0, A: 0 };
      })
    );

    // Aggregate results
    badgeCounts.forEach(count => {
      badges.SSPlus += count.SSPlus;
      badges.SS += count.SS;
      badges.SPlus += count.SPlus;
      badges.S += count.S;
      badges.A += count.A;
    });

    return badges;
  }
}
