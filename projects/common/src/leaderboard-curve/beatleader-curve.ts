/**
 * BeatLeader's performance point calculation, ported from the BeatLeader website
 * (`src/utils/beatleader/rebalanced-pp.js` and `pp.js`), which is kept consistent with the BeatLeader server.
 *
 * Maps that have a `noteSpan` use the rebalanced formula, other maps still use the legacy one. Modifiers are not
 * handled: speed modifiers swap in other ratings and No Fail scores no pp, and the overlay does not know which
 * modifiers are on.
 */

type CurvePoint = [accuracy: number, value: number];

/** The fields of a BeatLeader difficulty the pp calculation needs. */
export type BeatLeaderPpDifficulty = {
  accRating: number | null;
  passRating: number | null;
  techRating: number | null;
  predictedAcc?: number | null;
  sliderPercentage?: number | null;
  notes?: number | null;
  /** Only maps with the rebalanced ratings have this. */
  noteSpan?: number | null;
};

const FORMULA = {
  passScale: 12.3,
  passExponent: 2.62,
  passOffset: 30,
  passInner: 0.85966,
  accWeight: 34.519,
  accCurvePower: 0.9,
  lowStarCurvePower: 1.0,
  lowStarCurveStart: 7.1529,
  lowStarCurveEnd: 9.6894,
  veryLowStarCurvePower: 1.08,
  veryLowStarCurveStart: 3.478,
  veryLowStarCurveEnd: 5.3718,
  techWeight: 5.7887,
  techAccExponent: 0,
  starDivisor: 52,
  ppMultiplier: 1.0128,
  lowStarBonus: 0.007593,
  lowStarBonusEnd: 8.8584,
  lowStarBonusPower: 1.98,
  midStarTopBonus: 0.05,
  midStarTopStart: 4.2508,
  midStarTopFull: 6.3762,
  midStarTopFullEnd: 8.0,
  midStarTopEnd: 10.5,
  midStarTopAccBelow: 0.03,
  midStarTopAccAbove: 0,
  passTopKnee: 13,
  passTopSlope: 0.5,
  techTopKnee: 6.2754,
  techTopSlope: 0.7,
  passAccExponent: 6,
  passAccMaxMultiplier: 3,
  passAccMinMultiplier: 0.8,
  passAccErrorOffset: 1,
};

const STAR_ACCURACY = 0.96;

/** Points of the base accuracy curve, sorted by descending accuracy. */
const BASE_TABLE: CurvePoint[] = [
  [1.0, 7.2],
  [0.999, 6.241],
  [0.9975, 5.158],
  [0.995, 4.01],
  [0.9925, 3.241],
  [0.99, 2.7],
  [0.9875, 2.303],
  [0.985, 2.007],
  [0.9825, 1.786],
  [0.98, 1.618],
  [0.9775, 1.49],
  [0.975, 1.392],
  [0.9725, 1.315],
  [0.97, 1.256],
  [0.965, 1.167],
  [0.96, 1.094],
  [0.955, 1.039],
  [0.95, 1.0],
  [0.94, 0.926],
  [0.93, 0.861],
  [0.92, 0.804],
  [0.91, 0.76],
  [0.9, 0.727],
  [0.875, 0.675],
  [0.85, 0.627],
  [0.825, 0.584],
  [0.8, 0.549],
  [0.75, 0.469],
  [0.7, 0.4],
  [0.65, 0.343],
  [0.6, 0.297],
  [0.0, 0.0],
];

/** The accuracy curve of the legacy formula, sorted by descending accuracy. */
const LEGACY_TABLE: CurvePoint[] = [
  [1.0, 7.424],
  [0.999, 6.241],
  [0.9975, 5.158],
  [0.995, 4.01],
  [0.9925, 3.241],
  [0.99, 2.7],
  [0.9875, 2.303],
  [0.985, 2.007],
  [0.9825, 1.786],
  [0.98, 1.618],
  [0.9775, 1.49],
  [0.975, 1.392],
  [0.9725, 1.315],
  [0.97, 1.256],
  [0.965, 1.167],
  [0.96, 1.094],
  [0.955, 1.039],
  [0.95, 1.0],
  [0.94, 0.931],
  [0.93, 0.867],
  [0.92, 0.813],
  [0.91, 0.768],
  [0.9, 0.729],
  [0.875, 0.65],
  [0.85, 0.581],
  [0.825, 0.522],
  [0.8, 0.473],
  [0.75, 0.404],
  [0.7, 0.345],
  [0.65, 0.296],
  [0.6, 0.256],
  [0.0, 0.0],
];

/** Linear interpolation over a table sorted by descending accuracy, extrapolating from the ends. */
function interpolateDescending(table: CurvePoint[], accuracy: number): number {
  let index = 0;
  for (; index < table.length; index++) {
    if (table[index][0] <= accuracy) {
      break;
    }
  }
  if (index === 0) {
    index = 1;
  }
  if (index >= table.length) {
    index = table.length - 1;
  }
  const progress = (accuracy - table[index - 1][0]) / (table[index][0] - table[index - 1][0]);
  return table[index - 1][1] + progress * (table[index][1] - table[index - 1][1]);
}

/** Interpolates a built curve with a binary search (sorted by descending accuracy). */
function curveValue(accuracy: number, curve: CurvePoint[]): number {
  if (curve.length < 2) {
    return interpolateDescending(BASE_TABLE, accuracy);
  }
  let index = 0;
  let high = curve.length;
  while (index < high) {
    const middle = (index + high) >> 1;
    if (curve[middle][0] <= accuracy) {
      high = middle;
    } else {
      index = middle + 1;
    }
  }
  if (index === 0) {
    index = 1;
  }
  if (index >= curve.length) {
    index = curve.length - 1;
  }
  const progress = (accuracy - curve[index - 1][0]) / (curve[index][0] - curve[index - 1][0]);
  return curve[index - 1][1] + progress * (curve[index][1] - curve[index - 1][1]);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function ease(t: number): number {
  const clamped = clamp(t, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

// ---- Smooth (monotone cubic) version of the base table, used to shape the per-map curves ----

const SMOOTH = (() => {
  const points = [...BASE_TABLE].sort((a, b) => a[0] - b[0]);
  const count = points.length;
  const xs = points.map(point => point[0]);
  const ys = points.map(point => point[1]);
  const widths: number[] = [];
  const deltas: number[] = [];
  const slopes: number[] = new Array<number>(count).fill(0);
  for (let i = 0; i < count - 1; i++) {
    widths[i] = xs[i + 1] - xs[i];
    deltas[i] = (ys[i + 1] - ys[i]) / widths[i];
  }
  slopes[0] = deltas[0];
  slopes[count - 1] = deltas[count - 2];
  for (let i = 1; i < count - 1; i++) {
    if (deltas[i - 1] * deltas[i] <= 0) {
      continue;
    }
    const w1 = 2 * widths[i] + widths[i - 1];
    const w2 = widths[i] + 2 * widths[i - 1];
    slopes[i] = (w1 + w2) / (w1 / deltas[i - 1] + w2 / deltas[i]);
  }
  return { xs, ys, slopes };
})();

function smoothBaseValue(accuracy: number): number {
  const { xs, ys, slopes } = SMOOTH;
  if (accuracy <= xs[0]) {
    return ys[0];
  }
  if (accuracy >= xs[xs.length - 1]) {
    return ys[ys.length - 1];
  }
  let i = 0;
  while (xs[i + 1] < accuracy) {
    i++;
  }
  const width = xs[i + 1] - xs[i];
  const t = (accuracy - xs[i]) / width;
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * ys[i] +
    (t3 - 2 * t2 + t) * width * slopes[i] +
    (-2 * t3 + 3 * t2) * ys[i + 1] +
    (t3 - t2) * width * slopes[i + 1]
  );
}

type ModifiableCurveParams = {
  Y0: number;
  K: number;
  W: number;
  K2: number;
  P2: number;
  C: number;
  A: number;
};

type ModifiableCurve = { A: number; getValue: (accuracy: number) => number };

function modifiableCurve(overrides: Partial<ModifiableCurveParams> = {}): ModifiableCurve {
  const { Y0, K, W, K2, P2, C, A }: ModifiableCurveParams = {
    Y0: 0.256,
    K: 4.86,
    W: 0.6,
    K2: 2.88,
    P2: 2.46,
    C: 1.0,
    A: 1.0,
    ...overrides,
  };

  const getM = () => {
    const term1 = (1.0 - Y0) / 0.35;
    const term2 = 1.0 - W + (W * (K * Math.exp(K))) / (Math.exp(K) - 1.0);
    return term1 * term2;
  };
  const getF1 = (x: number) => {
    const u = (x - 0.6) / 0.35;
    const blend = (1.0 - W) * u + (W * (Math.exp(K * u) - 1.0)) / (Math.exp(K) - 1.0);
    return Y0 + (1.0 - Y0) * blend;
  };
  const getF2 = (x: number) => {
    const m = getM();
    const u2 = (x - 0.95) / 0.05;
    const expTerm = (Math.exp(K2 * Math.pow(u2, P2)) - 1.0) / (Math.exp(K2) - 1.0);
    return 1.0 + m * (x - 0.95) + (6.424 - 0.05 * m) * expTerm;
  };
  const getS = () => {
    const m = getM();
    const uA = (A - 0.95) / 0.05;
    const uAPower = uA > 0 ? Math.pow(uA, P2) : 0;
    const uAPowerMinus1 = uA > 0 ? Math.pow(uA, P2 - 1.0) : 0;
    const expTerm = Math.exp(K2 * uAPower) / (Math.exp(K2) - 1.0);
    const derivativeFactor = ((K2 * P2) / 0.05) * uAPowerMinus1;
    return m + (6.424 - 0.05 * m) * expTerm * derivativeFactor;
  };
  const getL = (x: number) => {
    const s = getS();
    const s1 = s * (1.0 - C);
    const f2A = getF2(A);
    if (Math.abs(A - 1.0) < 1e-9) {
      return f2A + s1 * (x - A);
    }
    const expTerm = 1.0 - Math.exp(-(x - A) / (1.0 - A));
    return f2A + s1 * (x - A) + (s - s1) * (1.0 - A) * expTerm;
  };

  return {
    A,
    getValue: (x: number) => {
      if (x <= 0.6) {
        return (Y0 / 0.6) * x;
      }
      if (x <= 0.95) {
        return getF1(x);
      }
      if (x <= A) {
        return getF2(x);
      }
      return getL(x);
    },
  };
}

type CurveRow = { predictedAcc: number; A: number; C: number; K: number; W: number; K2: number; P2: number };

const CURVE_SETTINGS = {
  table: [
    { predictedAcc: 0.955, A: 1.0, C: -5.3, K: 4.86, W: 0.6, K2: 2.88, P2: 2.46 },
    { predictedAcc: 0.96, A: 0.99, C: -3.0, K: 4.3, W: 0.66, K2: 4.8, P2: 1.85 },
    { predictedAcc: 0.965, A: 0.988, C: -2.4, K: 4.5, W: 0.64, K2: 4.5, P2: 1.95 },
    { predictedAcc: 0.97, A: 0.986, C: -2.2, K: 4.7, W: 0.62, K2: 4.2, P2: 2.05 },
    { predictedAcc: 0.975, A: 0.983, C: 0, K: 4.86, W: 0.6, K2: 3.8, P2: 2.15 },
    { predictedAcc: 0.98, A: 0.983, C: 0, K: 4.86, W: 0.6, K2: 3.35, P2: 2.3 },
    { predictedAcc: 0.985, A: 0.985, C: -0.6, K: 4.86, W: 0.6, K2: 2.88, P2: 2.46 },
    { predictedAcc: 0.99, A: 0.99, C: 0, K: 4.86, W: 0.6, K2: 2.88, P2: 2.46 },
    { predictedAcc: 0.995, A: 0.99, C: 0, K: 4.86, W: 0.6, K2: 2.88, P2: 2.46 },
  ] satisfies CurveRow[],
  maxC: 1,
  sliderTilt: 0.2,
  sliderTiltRange: 0.015,
  lowNoteStart: 115,
  lowNoteRefNotes: 20,
  lowNoteRefMultiplier: 0.8031,
  lowNoteMinMultiplier: 0.8031,
  shortStart: 75,
  shortRefSpan: 12,
  shortRefMultiplier: 0.9,
  shortMinMultiplier: 0.9,
};

function lowNoteFactor(notes: number): number {
  const s = CURVE_SETTINGS;
  if (s.lowNoteStart <= 0 || notes <= 0 || notes >= s.lowNoteStart || s.lowNoteRefNotes >= s.lowNoteStart) {
    return 1;
  }
  const nerf =
    ((1 - s.lowNoteRefMultiplier) * Math.log(s.lowNoteStart / notes)) /
    Math.log(s.lowNoteStart / s.lowNoteRefNotes);
  return clamp(1 - nerf, s.lowNoteMinMultiplier, 1);
}

function shortFactor(span: number): number {
  const s = CURVE_SETTINGS;
  if (s.shortStart <= 0 || span <= 0 || span >= s.shortStart || s.shortRefSpan >= s.shortStart) {
    return 1;
  }
  const nerf =
    ((1 - s.shortRefMultiplier) * Math.log(s.shortStart / span)) / Math.log(s.shortStart / s.shortRefSpan);
  return clamp(1 - nerf, s.shortMinMultiplier, 1);
}

function isDefaultRow(row: Pick<CurveRow, "A" | "K" | "W" | "K2" | "P2">): boolean {
  return row.A >= 0.9995 && row.K === 4.86 && row.W === 0.6 && row.K2 === 2.88 && row.P2 === 2.46;
}

type CurveParams = Pick<CurveRow, "A" | "C" | "K" | "W" | "K2" | "P2">;

function paramsAt(predictedAcc: number): CurveParams {
  const rows = [...CURVE_SETTINGS.table].sort((a, b) => a.predictedAcc - b.predictedAcc);
  const clampRow = (row: CurveParams): CurveParams => ({
    A: row.A,
    C: Math.min(row.C, CURVE_SETTINGS.maxC),
    K: row.K,
    W: row.W,
    K2: row.K2,
    P2: row.P2,
  });
  if (predictedAcc <= rows[0].predictedAcc) {
    return clampRow(rows[0]);
  }
  for (let i = 1; i < rows.length; i++) {
    if (predictedAcc <= rows[i].predictedAcc) {
      const previous = rows[i - 1];
      const next = rows[i];
      const t = (predictedAcc - previous.predictedAcc) / (next.predictedAcc - previous.predictedAcc);
      const mix = (from: number, to: number) => from + t * (to - from);
      return clampRow({
        A: mix(previous.A, next.A),
        C: mix(previous.C, next.C),
        K: mix(previous.K, next.K),
        W: mix(previous.W, next.W),
        K2: mix(previous.K2, next.K2),
        P2: mix(previous.P2, next.P2),
      });
    }
  }
  return clampRow(rows[rows.length - 1]);
}

type PerMapCurves = { modified: ModifiableCurve; standard: ModifiableCurve };

function perMapCurves(predictedAcc: number): PerMapCurves | undefined {
  if (predictedAcc <= 0.6 || predictedAcc >= 0.9995) {
    return undefined;
  }
  const row = paramsAt(predictedAcc);
  if (isDefaultRow(row)) {
    return undefined;
  }
  const A = clamp(row.A, 0.951, 1.0);
  return { modified: modifiableCurve({ ...row, A }), standard: modifiableCurve() };
}

function tableFactor(standard: ModifiableCurve, x: number): number {
  const reference = standard.getValue(x);
  return reference > 0 ? smoothBaseValue(x) / reference : 0;
}

function topTableFactor(standard: ModifiableCurve, a: number, x: number): number {
  const h = 1e-5;
  const atA = tableFactor(standard, a);
  const slope = (atA - tableFactor(standard, a - h)) / h;
  return atA + slope * (x - a);
}

function perMapValue(curves: PerMapCurves, x: number): number {
  const base = smoothBaseValue(x);
  const a = curves.modified.A;
  const factor =
    a < 0.9995 && x > a ? topTableFactor(curves.standard, a, x) : tableFactor(curves.standard, x);
  const value = factor > 0 ? curves.modified.getValue(x) * factor : base;
  return Math.min(base, value);
}

function sliderTiltAt(sliderPercentage: number, predictedAcc: number): number {
  if (CURVE_SETTINGS.sliderTilt === 0 || predictedAcc <= 0.6 || predictedAcc >= 0.9995) {
    return 0;
  }
  return CURVE_SETTINGS.sliderTilt * sliderPercentage;
}

const round6 = (x: number) => Math.round(x * 1e6) / 1e6;

/** Builds the accuracy curve of a difficulty from what the AI predicted for it. */
function buildAccCurve(
  predictedAcc: number,
  sliderPercentage: number,
  noteCount: number,
  noteSpan: number
): CurvePoint[] {
  const curves = perMapCurves(predictedAcc);
  const tilt = sliderTiltAt(sliderPercentage, predictedAcc);
  const nerf = lowNoteFactor(noteCount) * shortFactor(noteSpan);

  if (!curves && tilt === 0) {
    return BASE_TABLE.map(([x, y]) => [x, y * nerf]);
  }

  const a = curves?.modified.A ?? 1.0;
  const xs = new Set<number>();
  BASE_TABLE.forEach(([x]) => xs.add(round6(x)));
  for (let i = 0; i < 71; i++) {
    xs.add(round6(0.6 + i * 0.005));
  }
  for (let i = 0; i < 101; i++) {
    xs.add(round6(0.95 + i * 0.0005));
  }
  xs.add(round6(a));

  const raw = (x: number) => {
    let value = curves ? perMapValue(curves, x) : interpolateDescending(BASE_TABLE, x);
    if (tilt !== 0) {
      const distance = clamp(
        x - predictedAcc,
        -CURVE_SETTINGS.sliderTiltRange,
        CURVE_SETTINGS.sliderTiltRange
      );
      value *= Math.exp(tilt * distance * 100);
    }
    return value;
  };

  return [...xs]
    .filter(x => x >= 0 && x <= 1)
    .sort((x, y) => y - x)
    .map((x): CurvePoint => [x, raw(x) * nerf]);
}

// ---- pp ----

function passPp(passRating: number): number {
  let pass = passRating;
  if (FORMULA.passTopSlope !== 1 && pass > FORMULA.passTopKnee) {
    pass = FORMULA.passTopKnee + (pass - FORMULA.passTopKnee) * FORMULA.passTopSlope;
  }
  const result =
    FORMULA.passScale * Math.exp(FORMULA.passInner * Math.pow(pass, 1 / FORMULA.passExponent)) -
    FORMULA.passOffset;
  return Number.isFinite(result) && result >= 0 ? result : 0;
}

function curvePowerAt(stars: number): number {
  const f = FORMULA;
  if (f.veryLowStarCurvePower !== f.lowStarCurvePower && stars < f.veryLowStarCurveEnd) {
    if (stars <= f.veryLowStarCurveStart) {
      return f.veryLowStarCurvePower;
    }
    return (
      f.veryLowStarCurvePower +
      ((f.lowStarCurvePower - f.veryLowStarCurvePower) * (stars - f.veryLowStarCurveStart)) /
        (f.veryLowStarCurveEnd - f.veryLowStarCurveStart)
    );
  }
  if (f.lowStarCurvePower === f.accCurvePower || !(stars < f.lowStarCurveEnd)) {
    return f.accCurvePower;
  }
  if (stars <= f.lowStarCurveStart) {
    return f.lowStarCurvePower;
  }
  return (
    f.lowStarCurvePower +
    ((f.accCurvePower - f.lowStarCurvePower) * (stars - f.lowStarCurveStart)) /
      (f.lowStarCurveEnd - f.lowStarCurveStart)
  );
}

function accCurve(curveValueAtAccuracy: number, curveAt96: number, power: number): number {
  if (power === 1 || !(curveValueAtAccuracy > 0) || !(curveAt96 > 0)) {
    return curveValueAtAccuracy;
  }
  return curveAt96 * Math.pow(curveValueAtAccuracy / curveAt96, power);
}

function midStarTopBump(stars: number): number {
  const f = FORMULA;
  if (!(stars > f.midStarTopStart && stars < f.midStarTopEnd)) {
    return 0;
  }
  if (stars < f.midStarTopFull) {
    return ease((stars - f.midStarTopStart) / (f.midStarTopFull - f.midStarTopStart));
  }
  if (stars > f.midStarTopFullEnd) {
    return ease((f.midStarTopEnd - stars) / (f.midStarTopEnd - f.midStarTopFullEnd));
  }
  return 1;
}

function midStarTopMultiplier(stars: number, accuracy: number, predictedAcc: number): number {
  const f = FORMULA;
  if (f.midStarTopBonus === 0 || !(predictedAcc > 0)) {
    return 1;
  }
  const from = predictedAcc - f.midStarTopAccBelow;
  if (!(accuracy > from)) {
    return 1;
  }
  const bump = midStarTopBump(stars);
  if (bump === 0) {
    return 1;
  }
  const ramp = ease((accuracy - from) / (f.midStarTopAccBelow + f.midStarTopAccAbove));
  return 1 + f.midStarTopBonus * bump * ramp;
}

function passAccMultiplier(accuracy: number, predictedAcc: number): number {
  const f = FORMULA;
  if (f.passAccExponent === 0 || !(predictedAcc > 0)) {
    return 1;
  }
  const gap = accuracy - (predictedAcc - f.passAccErrorOffset * (1 - predictedAcc));
  const multiplier = Math.exp(f.passAccExponent * gap);
  const min = f.passAccMinMultiplier > 0 ? f.passAccMinMultiplier : 1 / f.passAccMaxMultiplier;
  return clamp(multiplier, min, f.passAccMaxMultiplier);
}

function techPp(accuracy: number, techRating: number): number {
  if (!(techRating > 0)) {
    return 0;
  }
  let tech = techRating;
  if (tech > FORMULA.techTopKnee) {
    tech = FORMULA.techTopKnee + (tech - FORMULA.techTopKnee) * FORMULA.techTopSlope;
  }
  return Math.exp(FORMULA.techAccExponent * accuracy) * FORMULA.techWeight * tech;
}

function lowStarMultiplier(stars: number): number {
  const f = FORMULA;
  if (f.lowStarBonus <= 0 || Number.isNaN(stars) || stars >= f.lowStarBonusEnd) {
    return 1;
  }
  return 1 + f.lowStarBonus * Math.pow(f.lowStarBonusEnd - Math.max(stars, 0), f.lowStarBonusPower);
}

const starsFromPpNoBonus = (ppAt96: number) => ppAt96 / FORMULA.starDivisor;

function starsFromPp(ppAt96: number): number {
  const stars = starsFromPpNoBonus(ppAt96);
  if (!(ppAt96 > 0) || FORMULA.lowStarBonus <= 0 || stars >= FORMULA.lowStarBonusEnd) {
    return stars;
  }
  let low = stars;
  let high = FORMULA.lowStarBonusEnd;
  while (high - low > 1e-6) {
    const middle = (low + high) / 2;
    if (middle < starsFromPpNoBonus(ppAt96 * lowStarMultiplier(middle))) {
      low = middle;
    } else {
      high = middle;
    }
  }
  return (low + high) / 2;
}

type PpParts = { pass: number; acc: number; tech: number };

function getPpParts(
  accuracy: number,
  ratings: { accRating: number; passRating: number; techRating: number },
  curve: CurvePoint[],
  stars: number | undefined,
  predictedAcc: number
): PpParts {
  const power = stars === undefined ? FORMULA.accCurvePower : curvePowerAt(stars);
  let value = curveValue(accuracy, curve);
  if (power !== 1) {
    value = accCurve(value, curveValue(STAR_ACCURACY, curve), power);
  }
  const acc = ratings.accRating > 0 ? value * FORMULA.accWeight * ratings.accRating : 0;
  return {
    pass: passPp(ratings.passRating) * passAccMultiplier(accuracy, predictedAcc),
    acc,
    tech: techPp(accuracy, ratings.techRating),
  };
}

/** The stars of the difficulty as BeatLeader calculates them from its ratings (not the stars the API sends). */
function getRebalancedStars(
  ratings: { accRating: number; passRating: number; techRating: number },
  curve: CurvePoint[],
  predictedAcc: number
): number {
  const { pass, acc, tech } = getPpParts(STAR_ACCURACY, ratings, curve, undefined, predictedAcc);
  return starsFromPp(pass + acc + tech);
}

// ---- legacy formula ----

function legacyInflate(pp: number): number {
  return (650 * Math.pow(pp, 1.3)) / Math.pow(650, 1.3);
}

function legacyPp(
  accuracy: number,
  ratings: { accRating: number; passRating: number; techRating: number }
): number {
  const rawPass = 15.2 * Math.exp(Math.pow(ratings.passRating, 1 / 2.62)) - 30;
  const pass = Number.isFinite(rawPass) && rawPass > 0 ? rawPass : 0;
  const acc = interpolateDescending(LEGACY_TABLE, accuracy) * ratings.accRating * 34;
  const tech = Math.exp(1.9 * accuracy) * 1.08 * ratings.techRating;
  return legacyInflate(pass + acc + tech);
}

/**
 * Prepares the pp calculation of a difficulty. Building the accuracy curve is the expensive part, so build the
 * calculator once and call it for every accuracy.
 *
 * @param difficulty the ratings of the difficulty, as sent by the BeatLeader API
 * @returns a function from accuracy (0-1) to the pp a score with that accuracy is worth, without modifiers
 */
function createCalculator(difficulty: BeatLeaderPpDifficulty): (accuracy: number) => number {
  const ratings = {
    accRating: difficulty.accRating ?? 0,
    passRating: difficulty.passRating ?? 0,
    techRating: difficulty.techRating ?? 0,
  };

  if (difficulty.noteSpan === null || difficulty.noteSpan === undefined) {
    return accuracy => (accuracy > 0 && accuracy <= 1 ? legacyPp(accuracy, ratings) : 0);
  }

  const predictedAcc = difficulty.predictedAcc ?? 0;
  const curve = buildAccCurve(
    predictedAcc,
    difficulty.sliderPercentage ?? 0,
    difficulty.notes ?? 0,
    difficulty.noteSpan
  );
  const stars = getRebalancedStars(ratings, curve, predictedAcc);

  return accuracy => {
    if (!(accuracy > 0) || accuracy > 1) {
      return 0;
    }
    const parts = getPpParts(accuracy, ratings, curve, stars, predictedAcc);
    const acc = parts.acc * midStarTopMultiplier(stars, accuracy, predictedAcc);
    const total = FORMULA.ppMultiplier * (parts.pass + acc + parts.tech) * lowStarMultiplier(stars);
    return Number.isFinite(total) ? total : 0;
  };
}

export const BeatLeaderCurve = {
  createCalculator,
};
