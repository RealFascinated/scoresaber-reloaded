import { ScoreSaberCurve } from "../leaderboard-curve/scoresaber-curve";

/**
 * Suggested maps model.
 *
 * A map is worth suggesting when players reach a higher accuracy on it than the star rating suggests, so it
 * pays more pp than other maps of the same stars. We model the logit of a score's accuracy as
 *
 *   y(player, map) = skill(player) + slope(player) * (stars(map) - STAR_PIVOT) + ease(map)
 *
 * `skill` and `slope` are per player, `ease` is per map. `ease` is shrunk towards a prior predicted from
 * the map's stars, so maps with few scores (or none at all) still get a sensible value. Note-density effects
 * are learned from the scores themselves rather than from map features. The fit is a few rounds of ridge regularised alternating least squares, which is cheap enough to
 * run over every ranked score.
 */

export const SUGGESTED_MAPS_STAR_PIVOT = 5;

/** Names of the features the map prior is regressed on, in column order. */
export const SUGGESTED_MAPS_MAP_FEATURES = ["bias", "stars", "stars^2"] as const;

export const SUGGESTED_MAPS_FEATURE_COUNT = SUGGESTED_MAPS_MAP_FEATURES.length;

export type SuggestedMapsParams = {
  /** Alternating least squares rounds. */
  iterations: number;
  /** How many scores a map needs before its own data outweighs the feature prior. */
  mapPriorStrength: number;
  /** Ridge pull of a player's skill towards the average player. */
  playerSkillPrior: number;
  /** Ridge pull of a player's star slope towards 0 (the global trend lives in the map prior). Higher = flatter. */
  playerSlopePrior: number;
  /** Ridge on the prior regression coefficients. */
  featureRidge: number;
  /** Scores below this accuracy (0-100) are ignored (abandoned / modded plays). */
  minAccuracy: number;
  /** Scores above this accuracy (0-100) are clamped so the logit stays finite. */
  maxAccuracy: number;
  /**
   * Fraction (0-1] of a player's best scores (by residual) their predicted skill is based on. Players farm
   * what they are good at and leave the rest, so the average of all scores underrates what they reach when
   * they go for a map. 1 = use every score.
   */
  skillQuantile: number;
  /** Rounds of re-selecting the best scores around the frontier line. */
  frontierRounds: number;
  /** A score counts half as much for every this many days of age (0 = no decay). Players improve over time. */
  halfLifeDays: number;
  /** A score's weight is divided by `1 + errorPenalty * (misses + bad cuts)`, so choked plays barely count. */
  errorPenalty: number;
  /** Full combos count this many times more. */
  fullComboBoost: number;
  /** Latent style factors per player and map (0 = plain skill + ease). */
  factors: number;
  /** Ridge pull of the factor vectors towards 0. Higher = fewer / smaller style effects. */
  factorRidge: number;
  /** Players need at least this many scores to take part in the fit. */
  minPlayerScores: number;
  /** Scores worth less raw pp than this are ignored, so the fit focuses on plays that matter for a top list. */
  minPp: number;
};

export const DEFAULT_SUGGESTED_MAPS_PARAMS: SuggestedMapsParams = {
  iterations: 12,
  mapPriorStrength: 25,
  playerSkillPrior: 1,
  playerSlopePrior: 10,
  featureRidge: 1,
  minAccuracy: 80,
  maxAccuracy: 99.99,
  skillQuantile: 0.3,
  frontierRounds: 3,
  halfLifeDays: 150,
  errorPenalty: 3,
  fullComboBoost: 3,
  factors: 0,
  factorRidge: 20,
  minPlayerScores: 10,
  minPp: 0,
};

/** Training data, struct-of-arrays so tens of millions of scores stay cheap. */
export type SuggestedMapsFitData = {
  playerCount: number;
  mapCount: number;
  /** Row -> player index. */
  playerIdx: Int32Array;
  /** Row -> map index. */
  mapIdx: Int32Array;
  /** Row -> logit of the accuracy. */
  y: Float32Array;
  /** Row -> weight (recency, quality of the play), 1 when absent. */
  weight?: Float32Array;
  /** Per map stars. */
  mapStars: Float64Array;
  /** Per map features, `mapCount * SUGGESTED_MAPS_FEATURE_COUNT`, row major. */
  mapFeatures: Float64Array;
};

export type SuggestedMapsModel = {
  params: SuggestedMapsParams;
  /** Per player skill (logit accuracy offset). */
  skill: Float64Array;
  /** Per player change of logit accuracy per star above the pivot. */
  slope: Float64Array;
  /** Per map ease (logit accuracy offset), shrunk towards `prior`. */
  ease: Float64Array;
  /** Per map ease predicted from features alone. */
  prior: Float64Array;
  /** Per map number of scores used in the fit. */
  mapScores: Int32Array;
  /** Coefficients of the feature prior. */
  coefficients: Float64Array;
  /** Per player number of scores used in the fit. */
  playerScores: Int32Array;
  /** Per player latent style vector, `playerCount * params.factors`. */
  playerFactors: Float64Array;
  /** Per map latent style vector, `mapCount * params.factors`. */
  mapFactors: Float64Array;
  /** Mean weight of the fitted scores. The ridge priors are relative to it (see `estimatePlayerSkill`). */
  weightScale: number;
};

/**
 * How much a score counts in the fit: recent, clean plays tell most about what a player can do.
 */
export function scoreWeight(
  score: { ageDays: number; errors: number; fullCombo: boolean },
  params: Pick<SuggestedMapsParams, "halfLifeDays" | "errorPenalty" | "fullComboBoost">
): number {
  let weight = params.halfLifeDays > 0 ? Math.pow(0.5, Math.max(0, score.ageDays) / params.halfLifeDays) : 1;
  weight /= 1 + params.errorPenalty * score.errors;
  return score.fullCombo ? weight * params.fullComboBoost : weight;
}

export function accuracyToLogit(accuracy: number, params: Pick<SuggestedMapsParams, "maxAccuracy">): number {
  const a = Math.min(accuracy, params.maxAccuracy) / 100;
  return Math.log(a / (1 - a));
}

export function logitToAccuracy(y: number): number {
  return 100 / (1 + Math.exp(-y));
}

/**
 * Builds the feature row of a map. nps / length / njs were tried as extra prior features, but they did not
 * improve predictions for maps without scores (see scripts/suggested-maps-sim), so the prior is stars only.
 */
export function buildMapFeatures(stars: number): number[] {
  const z = stars - SUGGESTED_MAPS_STAR_PIVOT;
  return [1, z, z * z];
}

/**
 * Solves the ridge regression `(X'WX + ridge*I) b = X'Wy` with Gauss-Jordan elimination.
 * The bias column is not regularised.
 */
function solveRidge(xtx: Float64Array, xty: Float64Array, ridge: number): Float64Array {
  const n = xty.length;
  const a = new Float64Array(n * (n + 1));
  const width = n + 1;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      a[i * width + j] = xtx[i * n + j] + (i === j && i > 0 ? ridge : 0);
    }
    a[i * width + n] = xty[i];
  }
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(a[row * width + col]) > Math.abs(a[pivot * width + col])) {
        pivot = row;
      }
    }
    if (Math.abs(a[pivot * width + col]) < 1e-12) {
      continue;
    }
    if (pivot !== col) {
      for (let k = 0; k < width; k++) {
        const tmp = a[col * width + k];
        a[col * width + k] = a[pivot * width + k];
        a[pivot * width + k] = tmp;
      }
    }
    const div = a[col * width + col];
    for (let k = col; k < width; k++) {
      a[col * width + k] /= div;
    }
    for (let row = 0; row < n; row++) {
      if (row === col) {
        continue;
      }
      const factor = a[row * width + col];
      if (factor === 0) {
        continue;
      }
      for (let k = col; k < width; k++) {
        a[row * width + k] -= factor * a[col * width + k];
      }
    }
  }
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = a[i * width + n];
  }
  return out;
}

/**
 * Regresses per-map ease on the map features, weighting each map by how reliable its own estimate is.
 */
function fitPrior(
  data: SuggestedMapsFitData,
  rawEase: Float64Array,
  mapWeight: Float64Array,
  priorStrength: number,
  params: SuggestedMapsParams
): Float64Array {
  const f = data.mapFeatures.length / data.mapCount;
  const xtx = new Float64Array(f * f);
  const xty = new Float64Array(f);
  for (let m = 0; m < data.mapCount; m++) {
    const n = mapWeight[m];
    if (n === 0) {
      continue;
    }
    const w = n / (n + priorStrength);
    const base = m * f;
    for (let i = 0; i < f; i++) {
      const xi = data.mapFeatures[base + i];
      xty[i] += w * xi * rawEase[m];
      for (let j = 0; j < f; j++) {
        xtx[i * f + j] += w * xi * data.mapFeatures[base + j];
      }
    }
  }
  return solveRidge(xtx, xty, params.featureRidge);
}

function predictPrior(data: SuggestedMapsFitData, coefficients: Float64Array): Float64Array {
  const f = data.mapFeatures.length / data.mapCount;
  const out = new Float64Array(data.mapCount);
  for (let m = 0; m < data.mapCount; m++) {
    let sum = 0;
    for (let i = 0; i < f; i++) {
      sum += coefficients[i] * data.mapFeatures[m * f + i];
    }
    out[m] = sum;
  }
  return out;
}

/**
 * Solves the small dense symmetric system `a x = b` in place (Gauss-Jordan with partial pivoting).
 */
function solveSmall(a: Float64Array, b: Float64Array, n: number, out: Float64Array): void {
  const w = n + 1;
  const m = new Float64Array(n * w);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      m[i * w + j] = a[i * n + j];
    }
    m[i * w + n] = b[i];
  }
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) {
      if (Math.abs(m[r * w + c]) > Math.abs(m[p * w + c])) {
        p = r;
      }
    }
    if (p !== c) {
      for (let k = 0; k < w; k++) {
        const t = m[c * w + k];
        m[c * w + k] = m[p * w + k];
        m[p * w + k] = t;
      }
    }
    const d = m[c * w + c];
    if (Math.abs(d) < 1e-12) {
      continue;
    }
    for (let k = c; k < w; k++) {
      m[c * w + k] /= d;
    }
    for (let r = 0; r < n; r++) {
      if (r === c) {
        continue;
      }
      const f = m[r * w + c];
      if (f !== 0) {
        for (let k = c; k < w; k++) {
          m[r * w + k] -= f * m[c * w + k];
        }
      }
    }
  }
  for (let i = 0; i < n; i++) {
    out[i] = m[i * w + n];
  }
}

/** Deterministic small random numbers to break the symmetry of the factors. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296 - 0.5;
  };
}

function markActiveRows(data: SuggestedMapsFitData, minPlayerScores: number) {
  const { playerIdx } = data;
  const playerScores = new Int32Array(data.playerCount);
  for (let i = 0; i < playerIdx.length; i++) {
    playerScores[playerIdx[i]]++;
  }
  const active = new Uint8Array(playerIdx.length);
  for (let i = 0; i < playerIdx.length; i++) {
    active[i] = playerScores[playerIdx[i]] >= minPlayerScores ? 1 : 0;
  }
  return { playerScores, active };
}

function accumulateRowTotals(
  data: SuggestedMapsFitData,
  active: Uint8Array,
  z: Float64Array,
  totals: {
    mapScores: Int32Array;
    mapWeight: Float64Array;
    sums: Float64Array;
    pa: Float64Array;
    pb: Float64Array;
    pc: Float64Array;
  }
) {
  const { playerIdx, mapIdx, y, weight } = data;
  const { mapScores, mapWeight, sums, pa, pb, pc } = totals;
  let weightSum = 0;
  let weightRows = 0;
  for (let i = 0; i < y.length; i++) {
    if (!active[i]) {
      continue;
    }
    const p = playerIdx[i];
    const m = mapIdx[i];
    const w = weight ? weight[i] : 1;
    const zm = z[m];
    weightSum += w;
    weightRows++;
    mapScores[m]++;
    mapWeight[m] += w;
    sums[m] += y[i] * w;
    pa[p] += w;
    pb[p] += w * zm;
    pc[p] += w * zm * zm;
  }
  return { weightSum, weightRows };
}

function accumulatePlayerResiduals(
  data: SuggestedMapsFitData,
  active: Uint8Array,
  ease: Float64Array,
  z: Float64Array,
  pu: Float64Array,
  pv: Float64Array
): void {
  const { playerIdx, mapIdx, y, weight } = data;
  for (let i = 0; i < y.length; i++) {
    if (!active[i]) {
      continue;
    }
    const m = mapIdx[i];
    const w = weight ? weight[i] : 1;
    const r = y[i] - ease[m];
    pu[playerIdx[i]] += w * r;
    pv[playerIdx[i]] += w * r * z[m];
  }
}

function accumulateMapResiduals(
  data: SuggestedMapsFitData,
  active: Uint8Array,
  skill: Float64Array,
  slope: Float64Array,
  z: Float64Array,
  mapSum: Float64Array
): void {
  const { playerIdx, mapIdx, y, weight } = data;
  for (let i = 0; i < y.length; i++) {
    if (!active[i]) {
      continue;
    }
    const p = playerIdx[i];
    const m = mapIdx[i];
    mapSum[m] += (weight ? weight[i] : 1) * (y[i] - skill[p] - slope[p] * z[m]);
  }
}

/**
 * Fits the model. Rows whose player has fewer than `minPlayerScores` scores are skipped, players and
 * maps are indexed `0 until playerCount` / `0 until mapCount`.
 */
export function fitSuggestedMapsModel(
  data: SuggestedMapsFitData,
  params: SuggestedMapsParams = DEFAULT_SUGGESTED_MAPS_PARAMS
): SuggestedMapsModel {
  const rows = data.y.length;
  const { playerCount, mapCount } = data;
  const k = params.factors;
  const weight = data.weight;

  const { playerScores, active } = markActiveRows(data, params.minPlayerScores);

  const z = new Float64Array(mapCount);
  for (let m = 0; m < mapCount; m++) {
    z[m] = data.mapStars[m] - SUGGESTED_MAPS_STAR_PIVOT;
  }

  const mapScores = new Int32Array(mapCount);
  const mapWeight = new Float64Array(mapCount);
  const sums = new Float64Array(mapCount);
  const pa = new Float64Array(playerCount);
  const pb = new Float64Array(playerCount);
  const pc = new Float64Array(playerCount);
  const { weightSum, weightRows } = accumulateRowTotals(data, active, z, {
    mapScores,
    mapWeight,
    sums,
    pa,
    pb,
    pc,
  });

  // The priors count in "scores", so they are scaled by the mean weight to keep their meaning.
  const weightScale = weightRows > 0 ? weightSum / weightRows : 1;
  const skillPrior = params.playerSkillPrior * weightScale;
  const slopePrior = params.playerSlopePrior * weightScale;
  const mapPrior = params.mapPriorStrength * weightScale;
  const factorRidge = params.factorRidge * weightScale;

  const skill = new Float64Array(playerCount);
  const slope = new Float64Array(playerCount);
  const ease = new Float64Array(mapCount);

  // Start from a feature prior fitted on plain per map means.
  const rawEase = new Float64Array(mapCount);
  for (let m = 0; m < mapCount; m++) {
    rawEase[m] = mapWeight[m] > 0 ? sums[m] / mapWeight[m] : 0;
  }
  let coefficients = fitPrior(data, rawEase, mapWeight, mapPrior, params);
  let prior = predictPrior(data, coefficients);
  for (let m = 0; m < mapCount; m++) {
    ease[m] = prior[m];
  }

  // Latent style factors: small random map vectors, zero player vectors, so the first player step is a plain fit.
  const playerFactors = new Float64Array(playerCount * k);
  const mapFactors = new Float64Array(mapCount * k);
  if (k > 0) {
    const random = seededRandom(12345);
    for (let i = 0; i < mapFactors.length; i++) {
      mapFactors[i] = random() * 0.2;
    }
  }
  /** The factor part of a row's prediction. */
  const factorTerm = (p: number, m: number): number => {
    let sum = 0;
    for (let f = 0; f < k; f++) {
      sum += playerFactors[p * k + f] * mapFactors[m * k + f];
    }
    return sum;
  };

  const pu = new Float64Array(playerCount);
  const pv = new Float64Array(playerCount);
  const mapSum = new Float64Array(mapCount);
  const fa = new Float64Array(playerCount * k * k);
  const fb = new Float64Array(playerCount * k);
  const ma = new Float64Array(mapCount * (k + 1) * (k + 1));
  const mb = new Float64Array(mapCount * (k + 1));
  const sa = new Float64Array((k + 1) * (k + 1));
  const sb = new Float64Array(k + 1);
  const sx = new Float64Array(k + 1);

  for (let iteration = 0; iteration < params.iterations; iteration++) {
    // Players, part 1: skill and slope on the residual left by ease and style.
    pu.fill(0);
    pv.fill(0);
    if (k === 0) {
      accumulatePlayerResiduals(data, active, ease, z, pu, pv);
    } else {
      for (let i = 0; i < rows; i++) {
        if (!active[i]) {
          continue;
        }
        const p = data.playerIdx[i];
        const m = data.mapIdx[i];
        const w = weight ? weight[i] : 1;
        const r = data.y[i] - ease[m] - factorTerm(p, m);
        pu[p] += w * r;
        pv[p] += w * r * z[m];
      }
    }
    for (let p = 0; p < playerCount; p++) {
      if (pa[p] === 0) {
        continue;
      }
      const a = pa[p] + skillPrior;
      const d = pc[p] + slopePrior;
      const det = a * d - pb[p] * pb[p];
      skill[p] = (d * pu[p] - pb[p] * pv[p]) / det;
      slope[p] = (a * pv[p] - pb[p] * pu[p]) / det;
    }

    // Players, part 2: style vectors, a k x k ridge system per player.
    if (k > 0) {
      fa.fill(0);
      fb.fill(0);
      for (let i = 0; i < rows; i++) {
        if (!active[i]) {
          continue;
        }
        const p = data.playerIdx[i];
        const m = data.mapIdx[i];
        const w = weight ? weight[i] : 1;
        const r = data.y[i] - skill[p] - slope[p] * z[m] - ease[m];
        for (let f = 0; f < k; f++) {
          const vf = mapFactors[m * k + f];
          fb[p * k + f] += w * vf * r;
          for (let g = 0; g < k; g++) {
            fa[(p * k + f) * k + g] += w * vf * mapFactors[m * k + g];
          }
        }
      }
      const matrix = new Float64Array(k * k);
      const rhs = new Float64Array(k);
      const out = new Float64Array(k);
      for (let p = 0; p < playerCount; p++) {
        if (pa[p] === 0) {
          continue;
        }
        for (let f = 0; f < k; f++) {
          rhs[f] = fb[p * k + f];
          for (let g = 0; g < k; g++) {
            matrix[f * k + g] = fa[(p * k + f) * k + g] + (f === g ? factorRidge : 0);
          }
        }
        solveSmall(matrix, rhs, k, out);
        for (let f = 0; f < k; f++) {
          playerFactors[p * k + f] = out[f];
        }
      }
    }

    if (k === 0) {
      mapSum.fill(0);
      accumulateMapResiduals(data, active, skill, slope, z, mapSum);
      for (let m = 0; m < mapCount; m++) {
        const shrunk = mapSum[m] + mapPrior * prior[m];
        const total = mapWeight[m] + mapPrior;
        ease[m] = Math.abs(total) < 1e-12 ? shrunk : shrunk / total;
        rawEase[m] = mapWeight[m] > 0 ? mapSum[m] / mapWeight[m] : 0;
      }
      coefficients = fitPrior(data, rawEase, mapWeight, mapPrior, params);
      prior = predictPrior(data, coefficients);
      continue;
    }

    // Maps: ease (shrunk towards the feature prior) and style vector (shrunk towards 0), jointly.
    const n1 = k + 1;
    ma.fill(0);
    mb.fill(0);
    mapSum.fill(0);
    for (let i = 0; i < rows; i++) {
      if (!active[i]) {
        continue;
      }
      const p = data.playerIdx[i];
      const m = data.mapIdx[i];
      const w = weight ? weight[i] : 1;
      const r = data.y[i] - skill[p] - slope[p] * z[m];
      mapSum[m] += w * (r - (k > 0 ? factorTerm(p, m) : 0));
      sx[0] = 1;
      for (let f = 0; f < k; f++) {
        sx[f + 1] = playerFactors[p * k + f];
      }
      for (let f = 0; f < n1; f++) {
        mb[m * n1 + f] += w * sx[f] * r;
        for (let g = 0; g < n1; g++) {
          ma[(m * n1 + f) * n1 + g] += w * sx[f] * sx[g];
        }
      }
    }
    for (let m = 0; m < mapCount; m++) {
      for (let f = 0; f < n1; f++) {
        sb[f] = mb[m * n1 + f];
        for (let g = 0; g < n1; g++) {
          sa[f * n1 + g] = ma[(m * n1 + f) * n1 + g];
        }
      }
      sa[0] += mapPrior;
      sb[0] += mapPrior * prior[m];
      for (let f = 1; f < n1; f++) {
        sa[f * n1 + f] += factorRidge;
      }
      const out = new Float64Array(n1);
      solveSmall(sa, sb, n1, out);
      ease[m] = out[0];
      for (let f = 0; f < k; f++) {
        mapFactors[m * k + f] = out[f + 1];
      }
      rawEase[m] = mapWeight[m] > 0 ? mapSum[m] / mapWeight[m] : 0;
    }

    coefficients = fitPrior(data, rawEase, mapWeight, mapPrior, params);
    prior = predictPrior(data, coefficients);
  }

  return {
    params,
    skill,
    slope,
    ease,
    prior,
    mapScores,
    coefficients,
    playerScores,
    playerFactors,
    mapFactors,
    weightScale,
  };
}

/**
 * The model's predicted logit accuracy for a player on a map of the fit.
 */
export function predictLogit(model: SuggestedMapsModel, player: number, map: number, stars: number): number {
  const k = model.params.factors;
  let style = 0;
  for (let f = 0; f < k; f++) {
    style += model.playerFactors[player * k + f] * model.mapFactors[map * k + f];
  }
  return (
    model.skill[player] + model.slope[player] * (stars - SUGGESTED_MAPS_STAR_PIVOT) + model.ease[map] + style
  );
}

/**
 * Estimates the skill and slope of a player from their own scores, given the fitted map ease. Used for
 * players who were not part of the fit (e.g. scores that arrived after it), and to turn a fit's average
 * skill into the player's frontier skill (see `SuggestedMapsParams.skillQuantile`).
 */
export function estimatePlayerSkill(
  scores: { ease: number; stars: number; accuracy: number; weight?: number }[],
  params: SuggestedMapsParams,
  weightScale: number = 1
): { skill: number; slope: number } {
  const points = scores
    .filter(score => score.accuracy >= params.minAccuracy)
    .map(score => ({
      z: score.stars - SUGGESTED_MAPS_STAR_PIVOT,
      r: accuracyToLogit(score.accuracy, params) - score.ease,
      w: score.weight ?? 1,
    }));

  const fitLine = (items: { z: number; r: number; w: number }[]): { skill: number; slope: number } => {
    let a = params.playerSkillPrior * weightScale;
    let b = 0;
    let d = params.playerSlopePrior * weightScale;
    let u = 0;
    let v = 0;
    for (const { z, r, w } of items) {
      a += w;
      b += w * z;
      d += w * z * z;
      u += w * r;
      v += w * r * z;
    }
    const det = a * d - b * b;
    if (det === 0) {
      return { skill: 0, slope: 0 };
    }
    return { skill: (d * u - b * v) / det, slope: (a * v - b * u) / det };
  };

  let line = fitLine(points);
  if (params.skillQuantile >= 1 || points.length === 0) {
    return line;
  }

  // Frontier: players go for the maps they can acc, so refit the line (skill AND star slope) on the best
  // residuals only. Their ceiling climbs much faster towards low stars than their average does.
  const keep = Math.max(1, Math.ceil(points.length * params.skillQuantile));
  for (let round = 0; round < params.frontierRounds; round++) {
    const current = line;
    const best = [...points]
      .sort((x, y) => y.r - current.skill - current.slope * y.z - (x.r - current.skill - current.slope * x.z))
      .slice(0, keep);
    line = fitLine(best);
  }
  return line;
}

/**
 * Predicts the accuracy (0-100) a player will get on a map.
 */
export function predictAccuracy(skill: number, slope: number, stars: number, ease: number): number {
  return logitToAccuracy(skill + slope * (stars - SUGGESTED_MAPS_STAR_PIVOT) + ease);
}

/**
 * Raw pp a score of the given accuracy is worth.
 */
export function ppAt(stars: number, accuracy: number): number {
  return ScoreSaberCurve.getPp(stars, accuracy);
}
