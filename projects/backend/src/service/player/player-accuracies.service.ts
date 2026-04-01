import { PlayerAccuracies } from "@ssr/common/player/player-accuracies";
import { ScoreSaberScoresRepository } from "../../repositories/scoresaber-scores.repository";

export class PlayerAccuraciesService {
  /**
   * Gets the player's average accuracies.
   *
   * @param playerId the player's id
   * @returns the player's accuracy
   */
  public static async getPlayerAverageAccuracies(playerId: string): Promise<PlayerAccuracies> {
    return ScoreSaberScoresRepository.selectAverageAccuracies(playerId);
  }
}
