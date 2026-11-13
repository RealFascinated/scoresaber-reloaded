import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import { SHARED_CONSTS } from "@ssr/common/shared-consts";
import { ScoreSaberScoresRepository } from "../../repositories/scoresaber-scores.repository";
import { UserPinnedScoresRepository, type PinResult } from "../../repositories/user-pinned-scores.repository";

export type PinScoreResult = "no-player" | "no-score" | PinResult;

export class UserPinnedScoresService {
  /**
   * Gets the ids of the scores a user pinned, in the order they were pinned.
   *
   * @param userId the user to get the pins of
   */
  public static getScoreIds(userId: string): Promise<number[]> {
    return UserPinnedScoresRepository.getScoreIds(userId);
  }

  /**
   * Pins one of the user's own scores, current or from their score history. Users can only pin
   * scores they set, and at most `SHARED_CONSTS.maxPinnedScores` of them.
   *
   * @param user the user that pins, with the player they play as (if any)
   * @param scoreId the score to pin
   */
  public static async pin(
    user: { id: string; playerId?: string | null },
    scoreId: number
  ): Promise<PinScoreResult> {
    if (!user.playerId) {
      return "no-player";
    }

    const score = await ScoreSaberScoresRepository.findAnyRowByScoreId(scoreId, DEFAULT_REALM_ID);
    if (score?.playerId !== user.playerId) {
      return "no-score";
    }

    return UserPinnedScoresRepository.pin(user.id, scoreId, SHARED_CONSTS.maxPinnedScores);
  }

  /**
   * Sets the message shown on a pinned score. A blank message removes it.
   *
   * @param userId the user that pinned the score
   * @param scoreId the pinned score
   * @param message the message to show
   * @returns false if the score isn't pinned by the user
   */
  public static setMessage(userId: string, scoreId: number, message: string): Promise<boolean> {
    return UserPinnedScoresRepository.setMessage(userId, scoreId, message.trim() || null);
  }

  /**
   * Unpins a score. Does nothing if it wasn't pinned.
   *
   * @param userId the user that unpins
   * @param scoreId the score to unpin
   */
  public static unpin(userId: string, scoreId: number): Promise<void> {
    return UserPinnedScoresRepository.unpin(userId, scoreId);
  }
}
