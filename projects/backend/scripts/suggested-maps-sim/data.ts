import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { ScoreSaberCurve } from "../../../common/src/leaderboard-curve/scoresaber-curve";
import {
  SUGGESTED_MAPS_FEATURE_COUNT,
  SuggestedMapsFitData,
  SuggestedMapsParams,
  accuracyToLogit,
  buildMapFeatures,
  scoreWeight,
} from "../../../common/src/suggested-maps/suggested-maps-model";

export type SimMap = {
  id: number;
  stars: number;
  name: string;
  difficulty: string;
  seconds: number;
  nps: number;
};

/** Raw rows: what the simulator replays, independent of the model parameters. */
export type SimDataset = {
  playerCount: number;
  maps: SimMap[];
  mapFeatures: Float64Array;
  /** Per map extra metadata features: nps, ln(seconds), njs, bomb ratio, obstacle ratio, bpm, ln(notes). */
  extraFeatures: number[][];
  mapStars: Float64Array;
  playerIdx: Int32Array;
  mapIdx: Int32Array;
  accuracy: Float32Array;
  /** Raw pp of each score at the realm 1 curve. */
  pp: Float32Array;
  /** Days between the score and the newest score in the dataset. */
  ageDays: Float32Array;
  /** Misses + bad cuts of the score. */
  errors: Uint16Array;
  /** 1 when the score is a full combo. */
  fullCombo: Uint8Array;
  /** 1 when the score used modifiers. */
  modifiers: Uint8Array;
};

/** How the simulator turns scores into training rows (the weights come from the model params). */
export type RowOptions = {
  /** Drop scores that used modifiers. */
  dropModifiers: boolean;
  /** Subtracted from the age of every score (when the model is fitted on the past of a time split). */
  ageOffsetDays: number;
};

export const DEFAULT_ROW_OPTIONS: RowOptions = {
  dropModifiers: false,
  ageOffsetDays: 0,
};

const num = (v: string): number | null => (v === "\\N" ? null : Number(v));

/**
 * Loads the dataset from the cache directory. The directory holds `scores.tsv` (playerId, leaderboardId,
 * accuracy, pp, timestamp) and `maps.tsv` (see dump.sh), and a binary cache is written next to them.
 */
export async function loadDataset(dir: string): Promise<SimDataset> {
  const ds = await loadRaw(dir);
  for (let i = 0; i < ds.accuracy.length; i++) {
    ds.pp[i] = ScoreSaberCurve.getPp(ds.mapStars[ds.mapIdx[i]], ds.accuracy[i]);
  }
  return ds;
}

async function loadRaw(dir: string): Promise<SimDataset> {
  const cachePath = `${dir}/dataset.bin`;
  const metaPath = `${dir}/dataset.json`;
  const rawMaps: string[][] = readFileSync(`${dir}/maps.tsv`, "utf8")
    .trim()
    .split("\n")
    .map(line => line.split("\t"));
  const mapRows = rawMaps.map(c => ({
    id: Number(c[0]),
    stars: Number(c[1]),
    name: c[2],
    difficulty: c[3],
    nps: num(c[6]),
    seconds: num(c[7]),
    njs: num(c[8]),
    notes: num(c[9]),
    bombs: num(c[10]),
    obstacles: num(c[11]),
    bpm: num(c[12]),
  }));
  const mapIndex = new Map<number, number>();
  mapRows.forEach((m, i) => mapIndex.set(m.id, i));
  const mapFeatures = new Float64Array(mapRows.length * SUGGESTED_MAPS_FEATURE_COUNT);
  const mapStars = new Float64Array(mapRows.length);
  const extraFeatures: number[][] = [];
  mapRows.forEach((m, i) => {
    mapFeatures.set(buildMapFeatures(m.stars), i * SUGGESTED_MAPS_FEATURE_COUNT);
    mapStars[i] = m.stars;
    extraFeatures[i] = [
      m.nps ?? 3,
      Math.log(Math.max(m.seconds ?? 130, 20)),
      m.njs ?? 16,
      (m.bombs ?? 0) / Math.max(m.notes ?? 400, 1),
      (m.obstacles ?? 0) / Math.max(m.notes ?? 400, 1),
      m.bpm ?? 150,
      Math.log(Math.max(m.notes ?? 400, 50)),
    ];
  });
  const simMaps: SimMap[] = mapRows.map(m => ({
    id: m.id,
    stars: m.stars,
    name: m.name,
    difficulty: m.difficulty,
    seconds: m.seconds ?? 0,
    nps: m.nps ?? 0,
  }));

  const extra = (n: number): Pick<SimDataset, "pp" | "ageDays" | "errors" | "fullCombo" | "modifiers"> => ({
    pp: new Float32Array(n),
    ageDays: new Float32Array(n),
    errors: new Uint16Array(n),
    fullCombo: new Uint8Array(n),
    modifiers: new Uint8Array(n),
  });
  const base = { maps: simMaps, mapFeatures, mapStars, extraFeatures };

  if (existsSync(cachePath) && existsSync(metaPath)) {
    const meta = JSON.parse(readFileSync(metaPath, "utf8")) as { rows: number; playerCount: number };
    const buf = readFileSync(cachePath);
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const n = meta.rows;
    // Layout: i32 player, i32 map, f32 accuracy, f32 ageDays, u16 errors, u8 fullCombo, u8 modifiers
    const ds: SimDataset = {
      ...base,
      playerCount: meta.playerCount,
      playerIdx: new Int32Array(ab, 0, n),
      mapIdx: new Int32Array(ab, n * 4, n),
      accuracy: new Float32Array(ab, n * 8, n),
      ...extra(n),
    };
    ds.ageDays = new Float32Array(ab, n * 12, n);
    ds.errors = new Uint16Array(ab, n * 16, n);
    ds.fullCombo = new Uint8Array(ab, n * 18, n);
    ds.modifiers = new Uint8Array(ab, n * 19, n);
    return ds;
  }

  const playerIndex = new Map<string, number>();
  const players: number[] = [];
  const maps2: number[] = [];
  const accs: number[] = [];
  const stamps: number[] = [];
  const errs: number[] = [];
  const fcs: number[] = [];
  const mods: number[] = [];
  const decoder = new TextDecoder();
  let tail = "";
  const stream = Bun.file(`${dir}/scores2.tsv`).stream();
  for await (const chunk of stream) {
    const text = tail + decoder.decode(chunk, { stream: true });
    const lines = text.split("\n");
    tail = lines.pop() ?? "";
    for (const line of lines) {
      // playerId, leaderboardId, accuracy, pp, timestamp, missed, badCuts, fullCombo, modifiers, hmd
      const c = line.split("\t");
      const mi = mapIndex.get(Number(c[1]));
      if (mi === undefined) {
        continue;
      }
      let pi = playerIndex.get(c[0]);
      if (pi === undefined) {
        pi = playerIndex.size;
        playerIndex.set(c[0], pi);
      }
      players.push(pi);
      maps2.push(mi);
      accs.push(Number(c[2]));
      stamps.push(Number(c[4]));
      errs.push(Math.min(65535, Number(c[5]) + Number(c[6])));
      fcs.push(Number(c[7]));
      mods.push(Number(c[8]));
    }
  }
  const n = players.length;
  const newest = stamps.reduce((a, b) => Math.max(a, b), 0);
  const out = new ArrayBuffer(n * 20);
  new Int32Array(out, 0, n).set(players);
  new Int32Array(out, n * 4, n).set(maps2);
  new Float32Array(out, n * 8, n).set(accs);
  new Float32Array(out, n * 12, n).set(stamps.map(t => (newest - t) / 86400));
  new Uint16Array(out, n * 16, n).set(errs);
  new Uint8Array(out, n * 18, n).set(fcs);
  new Uint8Array(out, n * 19, n).set(mods);
  writeFileSync(cachePath, new Uint8Array(out));
  writeFileSync(metaPath, JSON.stringify({ rows: n, playerCount: playerIndex.size }));
  return loadRaw(dir);
}

/** Builds fit data from a subset of the dataset rows, applying the params' accuracy filters and the row options. */
export function buildFitData(
  ds: SimDataset,
  keep: Uint8Array,
  params: SuggestedMapsParams,
  options: RowOptions = DEFAULT_ROW_OPTIONS
): SuggestedMapsFitData {
  const ok = (i: number): boolean =>
    keep[i] === 1 &&
    ds.accuracy[i] >= params.minAccuracy &&
    ds.pp[i] >= params.minPp &&
    !(options.dropModifiers && ds.modifiers[i]);
  let count = 0;
  for (let i = 0; i < keep.length; i++) {
    if (ok(i)) {
      count++;
    }
  }
  const playerIdx = new Int32Array(count);
  const mapIdx = new Int32Array(count);
  const y = new Float32Array(count);
  const weight = new Float32Array(count);
  let j = 0;
  for (let i = 0; i < keep.length; i++) {
    if (!ok(i)) {
      continue;
    }
    playerIdx[j] = ds.playerIdx[i];
    mapIdx[j] = ds.mapIdx[i];
    y[j] = accuracyToLogit(ds.accuracy[i], params);
    weight[j] = scoreWeight(
      {
        ageDays: ds.ageDays[i] - options.ageOffsetDays,
        errors: ds.errors[i],
        fullCombo: ds.fullCombo[i] === 1,
      },
      params
    );
    j++;
  }
  return {
    playerCount: ds.playerCount,
    mapCount: ds.maps.length,
    playerIdx,
    mapIdx,
    y,
    weight,
    mapStars: ds.mapStars,
    mapFeatures: ds.mapFeatures,
  };
}
