export function formatScoreAccuracy(accuracy: number) {
  return (accuracy == null || accuracy == Infinity || accuracy == -1 ? "-" : accuracy.toFixed(2)) + "%";
}
