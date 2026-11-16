/**
 * SuggestedMaps model simulator.
 *
 *   bun scripts/suggested-maps-sim/sim.ts [--dir=/tmp/ssr-ow] [--holdout=0.05] [--set key=value ...] [--sweep key=a,b,c]
 *
 * Holds out a random slice of scores, fits the model on the rest, and reports how well it predicts the held-out
 * accuracy / pp - against a stars-only baseline and a feature-only baseline - so parameters can be tuned by
 * looking at numbers instead of guessing. `--sweep` repeats the run for each value.
 */
import { ScoreSaberCurve } from "../../../common/src/leaderboard-curve/scoresaber-curve";
import {
  DEFAULT_SUGGESTED_MAPS_PARAMS,
  SUGGESTED_MAPS_FEATURE_COUNT,
  SUGGESTED_MAPS_STAR_PIVOT,
  SuggestedMapsFitData,
  SuggestedMapsModel,
  SuggestedMapsParams,
  accuracyToLogit,
  estimatePlayerSkill,
  fitSuggestedMapsModel,
  logitToAccuracy,
  predictLogit,
  scoreWeight,
} from "../../../common/src/suggested-maps/suggested-maps-model";
import { DEFAULT_ROW_OPTIONS, RowOptions, SimDataset, buildFitData, loadDataset } from "./data";

const args = process.argv.slice(2);
const opt = (name: string, fallback: string): string =>
  args.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;

const dir = opt("dir", "/tmp/ssr-ow");
const holdout = Number(opt("holdout", "0.05"));
const seed = Number(opt("seed", "1"));

function parseOverrides(): Partial<SuggestedMapsParams> {
  const out: Record<string, number> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--set" && args[i + 1]) {
      const [k, v] = args[i + 1].split("=");
      out[k] = Number(v);
    }
  }
  return out as Partial<SuggestedMapsParams>;
}

/** `--row key=value` overrides of how scores become training rows. */
function parseRowOptions(): RowOptions {
  const out: Record<string, number | boolean> = { ...DEFAULT_ROW_OPTIONS };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--row" && args[i + 1]) {
      const [k, v] = args[i + 1].split("=");
      out[k] = k === "dropModifiers" ? v === "true" : Number(v);
    }
  }
  return out as RowOptions;
}
const rowOptions = parseRowOptions();
/** Time split: the newest N days are the test set and the model only sees the past. */
/** Only evaluate on scores with at most this many misses + bad cuts (what a player reaches when it goes cleanly). */
const evalMaxErrors = Number(opt("evalMaxErrors", "99999"));
const timeSplit = Number(opt("timesplit", "0"));

function hash(i: number): number {
  let x = (i ^ (seed * 0x9e3779b9)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

type Metrics = {
  rmseLogit: number;
  maeAcc: number;
  rmsePp: number;
  maeAcc46: number;
  rmsePp46: number;
  n: number;
};

function evaluate(
  ds: SimDataset,
  test: Uint8Array,
  model: SuggestedMapsModel,
  scoreTrainCount: Int32Array
): Metrics {
  let n = 0;
  let se = 0;
  let ae = 0;
  let pe = 0;
  let n46 = 0;
  let ae46 = 0;
  let pe46 = 0;
  for (let i = 0; i < test.length; i++) {
    if (!test[i]) {
      continue;
    }
    const p = ds.playerIdx[i];
    if (scoreTrainCount[p] < model.params.minPlayerScores) {
      continue;
    }
    const m = ds.mapIdx[i];
    const stars = ds.mapStars[m];
    const actual = ds.accuracy[i];
    if (actual < 60 || ds.errors[i] > evalMaxErrors) {
      continue;
    }
    const yHat = predictLogit(model, p, m, stars);
    const accHat = logitToAccuracy(yHat);
    const d = yHat - accuracyToLogit(actual, model.params);
    const ppErr = ScoreSaberCurve.getPp(stars, accHat) - ScoreSaberCurve.getPp(stars, actual);
    n++;
    se += d * d;
    ae += Math.abs(accHat - actual);
    pe += ppErr * ppErr;
    if (stars >= 4.4 && stars <= 6 && scoreTrainCount[p] >= 100) {
      n46++;
      ae46 += Math.abs(accHat - actual);
      pe46 += ppErr * ppErr;
    }
  }
  return {
    rmseLogit: Math.sqrt(se / n),
    maeAcc: ae / n,
    rmsePp: Math.sqrt(pe / n),
    maeAcc46: ae46 / n46,
    rmsePp46: Math.sqrt(pe46 / n46),
    n,
  };
}

function maskedFeatures(data: SuggestedMapsFitData, columns: number[]): SuggestedMapsFitData {
  const f = SUGGESTED_MAPS_FEATURE_COUNT;
  const features = new Float64Array(data.mapFeatures.length);
  for (let m = 0; m < data.mapCount; m++) {
    for (const c of columns) {
      features[m * f + c] = data.mapFeatures[m * f + c];
    }
  }
  return { ...data, mapFeatures: features };
}

function fmt(label: string, m: Metrics): string {
  return `${label.padEnd(28)} n ${m.n}  logitRMSE ${m.rmseLogit.toFixed(4)}  accMAE ${m.maeAcc.toFixed(3)}  ppRMSE ${m.rmsePp.toFixed(2)}  | core(4.4-6★, ≥100 scores) accMAE ${m.maeAcc46.toFixed(3)} ppRMSE ${m.rmsePp46.toFixed(2)}`;
}

async function run(ds: SimDataset, params: SuggestedMapsParams, baselines: boolean): Promise<Metrics> {
  const n = ds.accuracy.length;
  const train = new Uint8Array(n);
  const test = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const isTest = timeSplit > 0 ? ds.ageDays[i] < timeSplit : hash(i) < holdout;
    (isTest ? test : train)[i] = 1;
  }
  const data = buildFitData(ds, train, params, { ...rowOptions, ageOffsetDays: timeSplit });
  if (process.env.DEBUG_ROWS) {
    console.log(
      "rowOptions",
      JSON.stringify(rowOptions),
      "mean weight",
      data.weight ? data.weight.reduce((a, b) => a + b, 0) / data.weight.length : 1
    );
  }
  const trainCount = new Int32Array(ds.playerCount);
  for (let i = 0; i < data.playerIdx.length; i++) {
    trainCount[data.playerIdx[i]]++;
  }

  if (baselines) {
    const starsOnly = fitSuggestedMapsModel(maskedFeatures(data, [0, 1, 2]), {
      ...params,
      mapPriorStrength: 1e9,
      playerSlopePrior: 1e9,
    });
    console.log(fmt("baseline: player + stars", evaluate(ds, test, starsOnly, trainCount)));
    const featOnly = fitSuggestedMapsModel(data, { ...params, mapPriorStrength: 1e9 });
    console.log(fmt("baseline: + map features", evaluate(ds, test, featOnly, trainCount)));
  }

  const t0 = performance.now();
  const model = fitSuggestedMapsModel(data, params);
  const fitMs = performance.now() - t0;
  const metrics = evaluate(ds, test, model, trainCount);
  console.log(fmt("full model", metrics) + `  (fit ${(fitMs / 1000).toFixed(1)}s)`);
  return metrics;
}

/**
 * Cold start: hides every score of a random 10% of maps, fits on the rest and predicts the hidden maps from
 * their features alone, i.e. how well a newly ranked map with no scores is predicted.
 */
async function coldStart(ds: SimDataset, params: SuggestedMapsParams): Promise<void> {
  const n = ds.accuracy.length;
  const hiddenMap = new Uint8Array(ds.maps.length);
  for (let m = 0; m < hiddenMap.length; m++) {
    hiddenMap[m] = hash(m + 7919) < 0.1 ? 1 : 0;
  }
  const train = new Uint8Array(n);
  const test = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    (hiddenMap[ds.mapIdx[i]] ? test : train)[i] = 1;
  }
  const data = buildFitData(ds, train, params);
  const trainCount = new Int32Array(ds.playerCount);
  for (let i = 0; i < data.playerIdx.length; i++) {
    trainCount[data.playerIdx[i]]++;
  }
  console.log("cold start (hidden maps, prior only), extra prior features:");
  const names = ["nps", "ln(seconds)", "njs", "bomb ratio", "obstacle ratio", "bpm", "ln(notes)"];
  const subsets = opt("subsets", "none;0;1;2;3;4;5;6;0,1;0,1,2,5,6;all").split(";");
  for (const subset of subsets) {
    const columns =
      subset === "none" ? [] : subset === "all" ? names.map((_, i) => i) : subset.split(",").map(Number);
    // Standardise the extra columns so the ridge treats them evenly.
    const width = 3 + columns.length;
    const features = new Float64Array(ds.maps.length * width);
    const mean = columns.map(c => ds.extraFeatures.reduce((a, row) => a + row[c], 0) / ds.maps.length);
    const sd = columns.map(
      (c, j) =>
        Math.sqrt(ds.extraFeatures.reduce((a, row) => a + (row[c] - mean[j]) ** 2, 0) / ds.maps.length) || 1
    );
    for (let m = 0; m < ds.maps.length; m++) {
      features.set(ds.mapFeatures.subarray(m * 3, m * 3 + 3), m * width);
      columns.forEach((c, j) => {
        features[m * width + 3 + j] = (ds.extraFeatures[m][c] - mean[j]) / sd[j];
      });
    }
    const model = fitSuggestedMapsModel({ ...data, mapFeatures: features }, params);
    console.log(
      fmt(
        `  + ${columns.map(c => names[c]).join(",") || "stars only"}`.slice(0, 30),
        evaluate(ds, test, model, trainCount)
      )
    );
  }
}

/** Lists the maps whose accuracy beats what their stars alone suggest the most. */
async function report(ds: SimDataset, params: SuggestedMapsParams, top: number): Promise<void> {
  const keep = new Uint8Array(ds.accuracy.length).fill(1);
  const data = buildFitData(ds, keep, params);
  const model = fitSuggestedMapsModel(data, params);
  const starsOnly = fitSuggestedMapsModel(maskedFeatures(data, [0, 1, 2]), {
    ...params,
    mapPriorStrength: 1e9,
    playerSlopePrior: 1e9,
  });
  // Reference player: one that gets ~97.5% on an average map of the band.
  const bandEase = ds.maps
    .map((map, m) =>
      map.stars >= 4.4 && map.stars <= 5.3 && model.mapScores[m] >= 30 ? model.ease[m] : null
    )
    .filter((e): e is number => e !== null)
    .sort((a, b) => a - b);
  const skillRef = Number(
    opt(
      "skill",
      String(accuracyToLogit(Number(opt("refAcc", "97.5")), params) - bandEase[bandEase.length >> 1])
    )
  );
  const minStars = Number(opt("minStars", "4.4"));
  const maxStars = Number(opt("maxStars", "5.3"));
  const rows = ds.maps
    .map((map, m) => {
      const accWith = logitToAccuracy(skillRef + model.ease[m]);
      const accBase = logitToAccuracy(skillRef + starsOnly.ease[m]);
      return {
        map,
        n: model.mapScores[m],
        accWith,
        accBase,
        surplus: ScoreSaberCurve.getPp(map.stars, accWith) - ScoreSaberCurve.getPp(map.stars, accBase),
      };
    })
    .filter(r => r.map.stars >= minStars && r.map.stars <= maxStars && r.n >= 30)
    .sort((a, b) => b.surplus - a.surplus)
    .slice(0, top);
  console.log(
    `top suggested maps ${minStars}-${maxStars}★ for a player of skill ${skillRef} (surplus = pp over a same-star map)`
  );
  for (const r of rows) {
    console.log(
      `  +${r.surplus.toFixed(0).padStart(3)}pp  acc ${r.accWith.toFixed(2)} vs ${r.accBase.toFixed(2)}  ${r.map.stars.toFixed(2)}★ ${Math.round(r.map.seconds)}s nps ${r.map.nps.toFixed(1)} n=${r.n}  ${r.map.name} [${r.map.difficulty}]`
    );
  }
}

/**
 * Frontier check: for players with plenty of scores, estimates skill from the training scores with different
 * `skillQuantile`s and compares the prediction with held-out scores that would have made the player's top 100
 * (the plays the feature is about). Bias is predicted minus actual accuracy: ~0 means the quantile is right.
 */
async function frontier(ds: SimDataset, params: SuggestedMapsParams): Promise<void> {
  const n = ds.accuracy.length;
  const train = new Uint8Array(n);
  const test = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const isTest = timeSplit > 0 ? ds.ageDays[i] < timeSplit : hash(i) < holdout * 2;
    (isTest ? test : train)[i] = 1;
  }
  const data = buildFitData(ds, train, params, { ...rowOptions, ageOffsetDays: timeSplit });
  const model = fitSuggestedMapsModel(data, params);
  const byPlayer = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const p = ds.playerIdx[i];
    if (model.playerScores[p] < 100) {
      continue;
    }
    let rows = byPlayer.get(p);
    if (!rows) {
      rows = [];
      byPlayer.set(p, rows);
    }
    rows.push(i);
  }
  const quantiles = opt("quantiles", "1,0.5,0.35,0.25,0.15,0.1").split(",").map(Number);
  const stat = quantiles.map(() => ({ n: 0, bias: 0, abs: 0, ppBias: 0 }));
  for (const [, rows] of byPlayer) {
    const trainRows = rows.filter(i => train[i] && ds.accuracy[i] >= params.minAccuracy);
    const topPp = trainRows.map(i => ds.pp[i]).sort((a, b) => b - a);
    const floor = topPp[Math.min(99, topPp.length - 1)];
    const relevant = rows.filter(i => test[i] && ds.pp[i] >= floor && ds.errors[i] <= evalMaxErrors);
    if (relevant.length === 0) {
      continue;
    }
    quantiles.forEach((q, k) => {
      const fit = estimatePlayerSkill(
        trainRows.map(i => ({
          ease: model.ease[ds.mapIdx[i]],
          stars: ds.mapStars[ds.mapIdx[i]],
          accuracy: ds.accuracy[i],
          weight: scoreWeight(
            { ageDays: ds.ageDays[i] - timeSplit, errors: ds.errors[i], fullCombo: ds.fullCombo[i] === 1 },
            params
          ),
        })),
        { ...params, skillQuantile: q },
        model.weightScale
      );
      for (const i of relevant) {
        const m = ds.mapIdx[i];
        const predicted = Math.min(
          logitToAccuracy(
            fit.skill + fit.slope * (ds.mapStars[m] - SUGGESTED_MAPS_STAR_PIVOT) + model.ease[m]
          ),
          99.5
        );
        stat[k].n++;
        stat[k].bias += predicted - ds.accuracy[i];
        stat[k].abs += Math.abs(predicted - ds.accuracy[i]);
        stat[k].ppBias += ScoreSaberCurve.getPp(ds.mapStars[m], predicted) - ds.pp[i];
      }
    });
  }
  console.log(`frontier: ${byPlayer.size} players, held-out scores that make the player's top 100`);
  quantiles.forEach((q, k) => {
    const s = stat[k];
    console.log(
      `  quantile ${String(q).padEnd(5)} n ${s.n}  accBias ${(s.bias / s.n).toFixed(3)}  accMAE ${(s.abs / s.n).toFixed(3)}  ppBias ${(s.ppBias / s.n).toFixed(1)}`
    );
  });
}

const ds = await loadDataset(dir);
console.log(`dataset: ${ds.accuracy.length} scores, ${ds.playerCount} players, ${ds.maps.length} maps`);
const base: SuggestedMapsParams = { ...DEFAULT_SUGGESTED_MAPS_PARAMS, ...parseOverrides() };

if (args.includes("--frontier")) {
  await frontier(ds, base);
  process.exit(0);
}
if (args.includes("--coldstart")) {
  await coldStart(ds, base);
  process.exit(0);
}
if (args.includes("--report")) {
  await report(ds, base, Number(opt("top", "25")));
  process.exit(0);
}

const sweepArg = args.find(a => a.startsWith("--sweep="));
if (sweepArg) {
  const [key, values] = sweepArg.slice(8).split("=");
  for (const v of values.split(",")) {
    console.log(`\n== ${key}=${v}`);
    await run(ds, { ...base, [key]: Number(v) }, false);
  }
} else {
  console.log("params", JSON.stringify(base));
  await run(ds, base, true);
}
