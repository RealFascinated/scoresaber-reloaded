import { clamp, lerp } from "../utils/math-utils";
import { PpCurvePoint } from "./pp-curve";

const WEIGHT_COEFFICIENT = 0.965;
const STAR_MULTIPLIER = 42.117208413;

/**
 * The default curve (realm 1), used until a realm's curve has been loaded.
 */
const DEFAULT_CURVE: PpCurvePoint[] = [
  [0, 0],
  [0.6, 0.18223233667439062],
  [0.65, 0.5866010012767576],
  [0.7, 0.6125565959114954],
  [0.75, 0.6451808210101443],
  [0.8, 0.6872268862950283],
  [0.825, 0.7150465663454271],
  [0.85, 0.7462290664143185],
  [0.875, 0.7816934560296046],
  [0.9, 0.825756123560842],
  [0.91, 0.8488375988124467],
  [0.92, 0.8728710341448851],
  [0.93, 0.9039994071865736],
  [0.94, 0.9417362980580238],
  [0.95, 1],
  [0.955, 1.0388633331418984],
  [0.96, 1.0871883573850478],
  [0.965, 1.1552120359501035],
  [0.97, 1.2485807759957321],
  [0.9725, 1.3090333065057616],
  [0.975, 1.3807102743105126],
  [0.9775, 1.4664726399289512],
  [0.98, 1.5702410055532239],
  [0.9825, 1.697536248647543],
  [0.985, 1.8563887693647105],
  [0.9875, 2.058947159052738],
  [0.99, 2.324506282149922],
  [0.99125, 2.4902905794106913],
  [0.9925, 2.685667856592722],
  [0.99375, 2.9190155639254955],
  [0.995, 3.2022017597337955],
  [0.99625, 3.5526145337555373],
  [0.9975, 3.996793606763322],
  [0.99825, 4.325027383589547],
  [0.999, 4.715470646416203],
  [0.9995, 5.019543595874787],
  [1, 5.367394282890631],
];

/**
 * Gets the modifier for the given accuracy.
 *
 * @param accuracy The accuracy.
 * @param curve The curve to use (sorted by ascending accuracy), defaults to the realm 1 curve.
 * @return The modifier.
 */
function getModifier(accuracy: number, curve: PpCurvePoint[] = DEFAULT_CURVE): number {
  accuracy = clamp(accuracy, 0, 100) / 100; // Normalize accuracy to a range of [0, 1]

  if (accuracy <= 0) {
    return 0;
  }

  if (accuracy >= 1) {
    return curve[curve.length - 1][1];
  }

  for (let i = 0; i < curve.length - 1; i++) {
    const [accuracy1, multiplier1] = curve[i];
    const [accuracy2, multiplier2] = curve[i + 1];
    if (accuracy >= accuracy1 && accuracy <= accuracy2) {
      return lerp(multiplier1, multiplier2, (accuracy - accuracy1) / (accuracy2 - accuracy1));
    }
  }

  return 0;
}

/**
 * Ngl i have no idea what this does.
 *
 * @param bottomScores
 * @param idx
 * @param expected
 * @private
 */
function calcRawPpAtIdx(bottomScores: Array<any>, idx: number, expected: number) {
  const oldBottomPp = getTotalWeightedPp(bottomScores, idx);
  const newBottomPp = getTotalWeightedPp(bottomScores, idx + 1);

  // 0.965^idx * rawPpToFind = expected + oldBottomPp - newBottomPp;
  // rawPpToFind = (expected + oldBottomPp - newBottomPp) / 0.965^idx;
  return (expected + oldBottomPp - newBottomPp) / Math.pow(WEIGHT_COEFFICIENT, idx);
}

/**
 * Gets the total amount of weighted pp from
 * the sorted pp array
 *
 * @param ppArray the sorted pp array
 * @param startIdx the index to start from
 * @param weightCoefficient the realm's per-rank weight decay
 * @returns the total amount of weighted pp
 * @private
 */
function getTotalWeightedPp(ppArray: Array<number>, startIdx = 0, weightCoefficient = WEIGHT_COEFFICIENT) {
  return ppArray.reduce(
    (cumulative, pp, idx) => cumulative + Math.pow(weightCoefficient, idx + startIdx) * pp,
    0
  );
}

/**
 * Gets the performance points (PP) based on stars and accuracy.
 *
 * @param stars The star count.
 * @param accuracy The accuracy.
 * @param curve The curve to use (sorted by ascending accuracy), defaults to the realm 1 curve.
 * @returns The calculated PP.
 */
function getPp(stars: number, accuracy: number, curve: PpCurvePoint[] = DEFAULT_CURVE): number {
  if (accuracy <= 1) {
    accuracy *= 100; // Convert the accuracy to a percentage
  }
  const pp = stars * STAR_MULTIPLIER; // Calculate base PP value
  return getModifier(accuracy, curve) * pp; // Calculate and return final PP value
}

/**
 * Gets the amount of raw pp you need
 * to gain the expected pp
 *
 * @param scoresPps the sorted pp array
 * @param expectedPp the expected pp gain
 * @returns the amount of raw pp
 */
function calcRawPpForExpectedPp(scoresPps: number[], expectedPp = 1) {
  let left = 0;
  let right = scoresPps.length - 1;
  let boundaryIdx = -1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const bottomSlice = scoresPps.slice(mid);
    const bottomPp = getTotalWeightedPp(bottomSlice, mid);

    bottomSlice.unshift(scoresPps[mid]);
    const modifiedBottomPp = getTotalWeightedPp(bottomSlice, mid);
    const diff = modifiedBottomPp - bottomPp;

    if (diff > expectedPp) {
      boundaryIdx = mid;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return boundaryIdx === -1
    ? calcRawPpAtIdx(scoresPps, 0, expectedPp)
    : calcRawPpAtIdx(scoresPps.slice(boundaryIdx + 1), boundaryIdx + 1, expectedPp);
}

/**
 * Gets the amount of raw pp needed to gain the expected weighted pp.
 *
 * @param scoresPps The sorted scores PP array.
 * @param expectedPp The expected weighted pp gain.
 * @returns The amount of raw pp needed to gain the expected weighted pp.
 */
function getRawPpForWeightedPpGain(scoresPps: number[], expectedPp: number): number {
  // If there are no existing scores, the amount of raw pp needed is just the expected weighted pp
  if (!scoresPps.length) {
    return expectedPp;
  }

  // Create a copy of scores and find where the expected weighted pp would fit
  const newScores = [...scoresPps];
  let insertIndex = newScores.findIndex(pp => expectedPp > pp);

  // If the expected weighted pp is smaller than all existing scores, add it to the end
  if (insertIndex === -1) {
    insertIndex = newScores.length;
  }

  // Insert the expected weighted pp value at the correct position
  newScores.splice(insertIndex, 0, expectedPp);

  // Calculate the total weighted PP before and after insertion
  const oldTotal = getTotalWeightedPp(scoresPps);
  const newTotal = getTotalWeightedPp(newScores);

  // The boundary is the difference between the new and old totals
  return newTotal - oldTotal;
}

export const ScoreSaberCurve = {
  DEFAULT_CURVE,
  STAR_MULTIPLIER,
  WEIGHT_COEFFICIENT,
  getPp,
  getModifier,
  calcRawPpForExpectedPp,
  getRawPpForWeightedPpGain,
  getTotalWeightedPp,
};
