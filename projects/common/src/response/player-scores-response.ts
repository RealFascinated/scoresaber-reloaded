import { PlayerScore } from "../score/player-score";
import { Metadata } from "../types/metadata";

export default interface PlayerScoresResponse<S, L> {
  /**
   * The scores that were set.
   */
  readonly scores: PlayerScore<S, L>[];

  /**
   * The pagination metadata.
   */
  readonly metadata: Metadata;
}
