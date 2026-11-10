import type { BeatLeaderOverlayDataResponse } from "@ssr/common/schemas/response/beatleader/overlay-data";

/**
 * Gets the accuracy (percent) of the personal best at a point in the song.
 *
 * @param pb the accuracy of the PB for each second
 * @param songTime the song time in seconds
 * @returns undefined when the PB had no accuracy yet at that time (or the time is not known)
 */
export function getPbAccuracyAt(
  pb: BeatLeaderOverlayDataResponse | undefined,
  songTime: number | undefined
): number | undefined {
  if (!pb || songTime === undefined) {
    return undefined;
  }
  if (pb.source === "final-only") {
    return pb.finalAccuracy;
  }

  const values = pb.accuracyBySecond;
  if (values.length === 0) {
    return undefined;
  }
  const time = Math.max(0, songTime);
  const index = Math.floor(time);
  if (index >= values.length - 1) {
    return values[values.length - 1] ?? undefined;
  }

  const current = values[index];
  if (current === null) {
    return undefined;
  }
  const next = values[index + 1];
  if (next === null) {
    return current;
  }
  return current + (next - current) * (time - index);
}

/**
 * Formats the difference between two accuracies with a leading sign.
 */
export function formatAccuracyDelta(delta: number, precision: number): string {
  const rounded = Number(delta.toFixed(precision));
  return `${rounded < 0 ? "-" : "+"}${Math.abs(rounded).toFixed(precision)}%`;
}
