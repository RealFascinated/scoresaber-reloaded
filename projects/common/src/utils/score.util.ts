import { PreviousScore } from "../model/score/previous-score";
import Score from "../model/score/score";


/**
 * Formats the accuracy for a score.
 *
 * @param score the score to format
 * @returns the formatted accuracy
 */
export function formatScoreAccuracy(score: Score | PreviousScore) {
  return (score.accuracy == null || score.accuracy == Infinity ? "-" : score.accuracy.toFixed(2)) + "%";
}
