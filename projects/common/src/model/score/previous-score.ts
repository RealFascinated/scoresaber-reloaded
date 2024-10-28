import { Modifier } from "../../score/modifier";

export type PreviousScore = {
  /**
   * The score of the previous score.
   */
  score: number;

  /**
   * The accuracy of the previous score.
   */
  accuracy: number;

  /**
   * The modifiers of the previous score.
   */
  modifiers?: Modifier[];

  /**
   * The misses of the previous score.
   */
  misses: number;

  /**
   * The missed notes of the previous score.
   */
  missedNotes: number;

  /**
   * The bad cuts of the previous score.
   */
  badCuts: number;

  /**
   * The full combo of the previous score.
   */
  fullCombo?: boolean;

  /**
   * When the previous score was set.
   */
  timestamp: Date;
};
