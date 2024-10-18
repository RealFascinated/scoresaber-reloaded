import { Modifier } from "./modifier";
import { Leaderboards } from "../leaderboard";

export default interface Score {
  /**
   * The leaderboard the score is from.
   */
  readonly leaderboard: Leaderboards;

  /**
   * The base score for the score.
   * @private
   */
  readonly score: number;

  /**
   * The accuracy of the score.
   */
  readonly accuracy: number;

  /**
   * The rank for the score.
   * @private
   */
  readonly rank: number;

  /**
   * The modifiers used on the score.
   * @private
   */
  readonly modifiers: Modifier[];

  /**
   * The amount total amount of misses.
   * @private
   */
  readonly misses: number;

  /**
   * The amount of missed notes.
   */
  readonly missedNotes: number;

  /**
   * The amount of bad cuts.
   * @private
   */
  readonly badCuts: number;

  /**
   * Whether every note was hit.
   * @private
   */
  readonly fullCombo: boolean;

  /**
   * The time the score was set.
   * @private
   */
  readonly timestamp: Date;
}
