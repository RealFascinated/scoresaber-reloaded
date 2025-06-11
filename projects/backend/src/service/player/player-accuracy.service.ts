import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { AccBadges } from "@ssr/common/player/acc-badges";
import { PlayerAccuracies } from "@ssr/common/player/player-accuracies";
import {
  PlayerScoreChartDataPoint,
  PlayerScoresChartResponse,
} from "@ssr/common/response/player-scores-chart";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import { ScoreService } from "../score/score.service";

export class PlayerAccuracyService {
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

    // Use aggregation to calculate averages in the database
    const result = await ScoreService.getPlayerScores(playerId, {
      projection: {
        accuracy: 1,
        pp: 1,
      },
      includeLeaderboard: false,
    });

    // Filter out any scores with invalid accuracy values
    const validScores = result.filter(
      playerScore =>
        Number.isFinite(playerScore.score.accuracy) &&
        playerScore.score.accuracy >= 0 &&
        playerScore.score.accuracy <= 100
    );

    if (validScores.length === 0) {
      return accuracies;
    }

    // Calculate averages in a single pass
    let unrankedScores = 0;
    let unrankedAccuracySum = 0;
    let totalAccuracySum = 0;

    for (const playerScore of validScores) {
      const accuracy = playerScore.score.accuracy;
      totalAccuracySum += accuracy;

      if (playerScore.score.pp === 0) {
        unrankedAccuracySum += accuracy;
        unrankedScores++;
      }
    }

    // Calculate averages, defaulting to 0 if no scores in category
    accuracies.unrankedAccuracy = unrankedScores > 0 ? unrankedAccuracySum / unrankedScores : 0;
    accuracies.averageAccuracy = validScores.length > 0 ? totalAccuracySum / validScores.length : 0;

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

    // Process scores in a single pass
    for (const playerScore of playerScores) {
      const accuracy = playerScore.score.accuracy;
      if (accuracy >= 95) {
        badges.SSPlus++;
      } else if (accuracy >= 90) {
        badges.SS++;
      } else if (accuracy >= 85) {
        badges.SPlus++;
      } else if (accuracy >= 80) {
        badges.S++;
      } else if (accuracy >= 70) {
        badges.A++;
      }
    }

    return badges;
  }

  /**
   * Gets the player's score chart data.
   *
   * @param playerId the player's id
   */
  public static async getPlayerScoreChart(playerId: string): Promise<PlayerScoresChartResponse> {
    const playerScores = await ScoreService.getPlayerScores(playerId, {
      includeLeaderboard: true,
      ranked: true,
      projection: {
        accuracy: 1,
        pp: 1,
        timestamp: 1,
      },
    });

    const data: PlayerScoreChartDataPoint[] = [];
    for (const playerScore of playerScores) {
      const leaderboard = playerScore.leaderboard as ScoreSaberLeaderboard;
      const score = playerScore.score as ScoreSaberScore;

      data.push({
        accuracy: score.accuracy,
        stars: leaderboard.stars,
        pp: score.pp,
        timestamp: score.timestamp,
        leaderboardId: leaderboard.id + "",
        leaderboardName: leaderboard.fullName,
        leaderboardDifficulty: getDifficultyName(getDifficulty(leaderboard.difficulty.difficulty)),
      });
    }

    return {
      data,
    };
  }
}
