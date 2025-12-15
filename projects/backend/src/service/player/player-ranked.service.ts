import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { PlayerRankedPpsResponse } from "@ssr/common/response/player-ranked-pps-response";
import { updateScoreWeights } from "@ssr/common/utils/scoresaber.util";
import { PlayerCoreService } from "./player-core.service";

export class PlayerRankedService {
  /**
   * Gets the ranked pp scores for a player.
   *
   * @param playerId the player's id
   * @returns the ranked pp scores
   */
  public static async getPlayerPps(playerId: string): Promise<PlayerRankedPpsResponse> {
    await PlayerCoreService.playerExists(playerId, true);

    const playerScores = await ScoreSaberScoreModel.find({
      playerId: playerId,
      pp: { $gt: 0 },
    })
      .select({
        pp: 1,
        scoreId: 1,
      })
      .lean();

    if (playerScores.length === 0) {
      return {
        scores: [],
      };
    }

    const scores = playerScores.map(score => ({
      pp: score.pp,
      scoreId: score.scoreId,
    }));

    updateScoreWeights(scores); // Set the weights for the scores
    return {
      scores,
    };
  }

  /**
   * Gets the pp boundary for a player.
   *
   * @param playerId the player's id
   * @param boundary the pp boundary
   */
  public static async getPlayerPpBoundary(playerId: string, boundary: number = 1): Promise<number[]> {
    // Get the ranked pps list for the player
    const result = await ScoreSaberScoreModel.aggregate([
      {
        $match: {
          playerId: playerId,
          pp: { $gt: 0 },
        },
      },
      {
        $sort: { pp: -1 },
      },
      {
        $group: {
          _id: null,
          pps: { $push: "$pp" },
        },
      },
    ]);

    if (!result.length || !result[0].pps.length) {
      return [0];
    }

    // Calculate all boundaries in a single pass
    const boundaries: number[] = [];
    for (let i = 1; i <= boundary; i++) {
      boundaries.push(ScoreSaberCurve.calcPpBoundary(result[0].pps, i));
    }

    return boundaries;
  }

  /**
   * Gets the pp boundary amount for a pp value.
   *
   * @param playerId the player's id
   * @param boundary the pp boundary
   */
  public static async getPlayerPpBoundaryFromScorePp(playerId: string, boundary: number = 1): Promise<number> {
    await PlayerCoreService.playerExists(playerId, true);
    const scoresPps = await this.getPlayerPps(playerId);
    if (scoresPps.scores.length === 0) {
      return 0;
    }

    return ScoreSaberCurve.getPpBoundaryForRawPp(
      scoresPps.scores.map(score => score.pp),
      boundary
    );
  }
}
