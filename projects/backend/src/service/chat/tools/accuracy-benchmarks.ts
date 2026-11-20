import { ACCURACY_BENCHMARKS, type AccuracyBenchmark } from "./accuracy-benchmark-data";

const ELITE_ACCURACY = 99;
const UNREALISTIC_ACCURACY = 99.5;
const REACHED_TOLERANCE = 0.05;

export type AccuracyTier = "reachable" | "stretch" | "elite" | "unrealistic";

/**
 * The accuracy percentiles of all ranked scores in the whole-star bucket of the given stars.
 */
export function getAccuracyBenchmark(stars: number) {
  const bucket = Math.floor(stars);
  const lowest = ACCURACY_BENCHMARKS[0];
  const highest = ACCURACY_BENCHMARKS[ACCURACY_BENCHMARKS.length - 1];
  const clamped = Math.min(Math.max(bucket, lowest.starBucket), highest.starBucket);
  const benchmark: AccuracyBenchmark =
    ACCURACY_BENCHMARKS.find(entry => entry.starBucket === clamped) ?? highest;
  return benchmark;
}

/**
 * How rare an accuracy is among all ranked scores at these stars.
 */
export function describeAccuracyRarity(accuracy: number, stars: number) {
  const benchmark = getAccuracyBenchmark(stars);
  if (accuracy >= benchmark.p999) {
    return "top 0.1% or rarer";
  }
  if (accuracy >= benchmark.p99) {
    return "top 1%";
  }
  if (accuracy >= benchmark.p90) {
    return "top 10%";
  }
  if (accuracy >= benchmark.p50) {
    return "top 50%";
  }
  return "below the median";
}

/**
 * Judges whether an accuracy is a sensible goal. Anything the player already reached at similar stars is
 * reachable. Otherwise 99.5% and above is unrealistic, 99% and above or the top 0.1% is elite, the top 1% is a
 * stretch, and everything below that is reachable.
 *
 * @param playerBestAtSimilarStars the player's best accuracy on maps within a star of this one, or null
 */
export function classifyAccuracy(accuracy: number, stars: number, playerBestAtSimilarStars: number | null) {
  const benchmark = getAccuracyBenchmark(stars);
  let tier: AccuracyTier = "reachable";
  if (accuracy >= UNREALISTIC_ACCURACY) {
    tier = "unrealistic";
  } else if (playerBestAtSimilarStars !== null && accuracy <= playerBestAtSimilarStars + REACHED_TOLERANCE) {
    tier = "reachable";
  } else if (accuracy >= ELITE_ACCURACY || accuracy >= benchmark.p999) {
    tier = "elite";
  } else if (accuracy >= benchmark.p99) {
    tier = "stretch";
  }
  return { tier, rarity: describeAccuracyRarity(accuracy, stars) };
}
