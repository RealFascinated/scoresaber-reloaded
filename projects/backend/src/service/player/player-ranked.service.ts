import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { PlayerPpsResponse } from "@ssr/common/schemas/response/player/player-pps";
import { updateScoreWeights } from "@ssr/common/utils/scoresaber.util";
import { PlayerCoreService } from "./player-core.service";

export class PlayerRankedService {
  /**
   * Gets the ranked pp scores for a player.
   *
   * @param playerId the player's id
   * @returns the ranked pp scores
   */
  public static async getPlayerPps(playerId: string): Promise<PlayerPpsResponse> {
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
      weight: 0,
    }));

    updateScoreWeights(scores); // Set the weights for the scores
    return {
      scores,
    };
  }

  /**
   * Gets the raw pp needed to gain 1 weighted pp for a player.
   *
   * @param playerId the player's id
   * @returns the raw pp needed to gain 1 weighted pp
   */
  public static async getPlayerWeightedPpGainForRawPp(playerId: string): Promise<number> {
    const playerScores = await ScoreSaberScoreModel.find({
      playerId: playerId,
      pp: { $gt: 0 },
    })
      .select({
        pp: 1,
      })
      .lean();

    // No ranked score set
    if (playerScores.length === 0) {
      return 0;
    }
    return ScoreSaberCurve.calcRawPpForExpectedPp(
      playerScores.map(score => score.pp),
      1
    );
  }
}
