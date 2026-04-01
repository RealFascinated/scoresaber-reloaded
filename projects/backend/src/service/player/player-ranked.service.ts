import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
import { PlayerPpsResponse } from "@ssr/common/schemas/response/player/player-pps";
import { updateScoreWeights } from "@ssr/common/utils/scoresaber.util";
import { ScoreSaberScoresRepository } from "../../repositories/scoresaber-scores.repository";
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

    const playerScores = await ScoreSaberScoresRepository.getPpAndScoreIdByPlayer(playerId);

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
  public static async getPlayerPlusOnePp(playerId: string): Promise<number> {
    const playerScores = await ScoreSaberScoresRepository.getPpByPlayer(playerId);

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
