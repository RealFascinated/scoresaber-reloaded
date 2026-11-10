/**
 * A point on a realm's pp curve: [accuracy (0-1), pp multiplier].
 */
export type PpCurvePoint = [accuracy: number, multiplier: number];

/**
 * Normalises a curve from the ScoreSaber API (which is sorted
 * by descending accuracy) so it can be interpolated.
 */
export function sortPpCurve(points: PpCurvePoint[]): PpCurvePoint[] {
  return [...points].sort((a, b) => a[0] - b[0]);
}
