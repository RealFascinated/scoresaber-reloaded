import { NotFoundError } from "@ssr/common/error/not-found-error";
import { PinnedScoresResponse } from "@ssr/common/schemas/response/user/pinned-scores";
import { UserPinnedScoresRepository } from "../../repositories/user-pinned-scores.repository";
import { PlayerScoresService } from "./player-scores.service";

export class PlayerPinnedScoresService {
  /**
   * Gets the scores a player pinned to the top of their profile.
   *
   * A pin shows that exact score, even once the player has improved it. A pin whose score is gone (like after a score reset) is skipped.
   *
   * @param playerId the player to get the pinned scores of
   * @param realmId the realm to resolve pp for
   */
  public static async getPinnedScores(playerId: string, realmId: number): Promise<PinnedScoresResponse> {
    const pins = await UserPinnedScoresRepository.getPinsByPlayerId(playerId);

    const scores = await Promise.all(
      pins.map(async ({ scoreId, message }) => {
        try {
          const playerScore = await PlayerScoresService.getScore(scoreId, realmId);
          return message ? { ...playerScore, message } : playerScore;
        } catch (error) {
          if (error instanceof NotFoundError) {
            return undefined;
          }
          throw error;
        }
      })
    );

    return { items: scores.flatMap(score => (score ? [score] : [])) };
  }
}
