/**
 * Formats the accuracy for a score.
 *
 * @param score the score to format
 * @returns the formatted accuracy
 */
export function formatScoreAccuracy(accuracy: number) {
  return (accuracy == null || accuracy == Infinity ? "-" : accuracy.toFixed(2)) + "%";
}
