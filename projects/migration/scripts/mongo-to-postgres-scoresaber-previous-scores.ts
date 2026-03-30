import * as dotenv from "@dotenvx/dotenvx";
import { env } from "@ssr/common/env";
import type { HMD } from "@ssr/common/hmds";
import Logger from "@ssr/common/logger";
import { MapCharacteristic } from "@ssr/common/schemas/map/map-characteristic";
import { MapDifficulty } from "@ssr/common/schemas/map/map-difficulty";
import { normalizeModifiers } from "@ssr/common/score/modifier";
import { mongoose } from "@typegoose/typegoose";
import { db } from "backend/db";
import { scoreSaberScoreHistoryTable } from "backend/db/schema";
import { ScoreSaberPreviousScoreModel } from "../src/model/score/impl/scoresaber-previous-score";

dotenv.config();

/** Lean Mongo document from `scoresaber-previous-scores` collection. */
type MongoScoreSaberPreviousScoreLeanDoc = {
  _id?: unknown;
  scoreId?: unknown;
  playerId?: unknown;
  leaderboardId?: unknown;
  difficulty?: unknown;
  characteristic?: unknown;
  score?: unknown;
  accuracy?: unknown;
  pp?: unknown;
  missedNotes?: unknown;
  badCuts?: unknown;
  maxCombo?: unknown;
  fullCombo?: unknown;
  modifiers?: unknown;
  hmd?: unknown;
  controllers?: {
    leftController?: unknown;
    rightController?: unknown;
  };
  timestamp?: Date | string;
};

function truncateVarchar32(s: string | undefined | null): string | null {
  if (s == null || s === "") {
    return null;
  }
  return s.length <= 32 ? s : s.slice(0, 32);
}

function truncateVarchar64(s: string): string {
  return s.length <= 64 ? s : s.slice(0, 64);
}

function truncateVarchar128(s: string): string {
  return s.length <= 128 ? s : s.slice(0, 128);
}

/**
 * ScoreSaber score id for PG `scoreId` (references the superseded score, same as `"scoresaber-scores".id`).
 * Prefer `scoreId` over `_id`: previous-scores uses a separate auto-increment for `_id` (tracker `previous-scores`),
 * so `_id` is not the ScoreSaber id.
 */
function parseHistoryScoreId(doc: MongoScoreSaberPreviousScoreLeanDoc): number | null {
  const raw = doc.scoreId ?? doc._id;
  if (raw == null) {
    return null;
  }
  const n = typeof raw === "number" ? raw : Number.parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function asRequiredDate(v: Date | string | undefined): Date | null {
  if (v == null) {
    return null;
  }
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function asInt(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) {
    return Math.trunc(v);
  }
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function asFiniteNumber(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function normalizeModifiersForPg(raw: unknown): string[] | null {
  if (!Array.isArray(raw) || raw.length === 0) {
    return null;
  }
  const asStrings = raw.map(m => String(m));
  const normalized = normalizeModifiers(asStrings);
  if (normalized.length === 0) {
    return null;
  }
  return normalized.map(m => m.toString());
}

/**
 * Maps Mongo `scoresaber-previous-scores` doc → Drizzle insert for `"scoresaber-score-history"`
 * (`id` is serial — omitted).
 */
function mongoPreviousScoreDocToRow(
  doc: MongoScoreSaberPreviousScoreLeanDoc
): typeof scoreSaberScoreHistoryTable.$inferInsert {
  const scoreId = parseHistoryScoreId(doc);
  if (scoreId == null) {
    throw new Error("missing or invalid scoreId / _id");
  }

  const playerIdRaw =
    doc.playerId == null ? "" : typeof doc.playerId === "string" ? doc.playerId : String(doc.playerId);
  if (playerIdRaw.length === 0 || playerIdRaw.length > 32) {
    throw new Error("invalid playerId");
  }

  const leaderboardId = asInt(doc.leaderboardId, NaN);
  if (!Number.isFinite(leaderboardId)) {
    throw new Error("invalid leaderboardId");
  }

  const difficulty = truncateVarchar64(String(doc.difficulty ?? ""));
  const characteristic = truncateVarchar128(String(doc.characteristic ?? "Standard"));
  if (difficulty.length === 0) {
    throw new Error("missing difficulty");
  }

  const timestamp = asRequiredDate(doc.timestamp);
  if (timestamp == null) {
    throw new Error("missing or invalid timestamp");
  }

  const modifiers = normalizeModifiersForPg(doc.modifiers);
  const c = doc.controllers;
  const hmd = (truncateVarchar32(doc.hmd != null ? String(doc.hmd) : undefined) ?? "Unknown") as HMD;

  return {
    playerId: playerIdRaw,
    leaderboardId,
    scoreId,
    difficulty: difficulty as MapDifficulty,
    characteristic: characteristic as MapCharacteristic,
    score: asInt(doc.score, 0),
    accuracy: asFiniteNumber(doc.accuracy, 0),
    pp: asFiniteNumber(doc.pp, 0),
    missedNotes: asInt(doc.missedNotes, 0),
    badCuts: asInt(doc.badCuts, 0),
    maxCombo: asInt(doc.maxCombo, 0),
    fullCombo: Boolean(doc.fullCombo),
    modifiers,
    hmd,
    rightController: truncateVarchar32(c?.rightController != null ? String(c.rightController) : undefined),
    leftController: truncateVarchar32(c?.leftController != null ? String(c.leftController) : undefined),
    timestamp,
  };
}

function parseLimit(argv: string[]): number | undefined {
  const raw = argv.find(a => a.startsWith("--limit="));
  if (!raw) {
    return undefined;
  }
  const n = Number.parseInt(raw.slice("--limit=".length), 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function parseBatchSize(argv: string[]): number {
  const raw = argv.find(a => a.startsWith("--batch-size="));
  if (!raw) {
    return 500;
  }
  const n = Number.parseInt(raw.slice("--batch-size=".length), 10);
  if (!Number.isFinite(n)) {
    return 500;
  }
  return Math.min(2000, Math.max(50, n));
}

/** Optional `--player-id=7656119...` to migrate rows for a single player only. */
function parsePlayerIdFilter(argv: string[]): string | undefined {
  const raw = argv.find(a => a.startsWith("--player-id="));
  if (!raw) {
    return undefined;
  }
  const id = raw.slice("--player-id=".length).trim();
  return id.length > 0 ? id : undefined;
}

/** Optional `--leaderboard-id=123` to migrate rows for a single leaderboard only. */
function parseLeaderboardIdFilter(argv: string[]): number | undefined {
  const raw = argv.find(a => a.startsWith("--leaderboard-id="));
  if (!raw) {
    return undefined;
  }
  const id = raw.slice("--leaderboard-id=".length).trim();
  if (id.length === 0) {
    return undefined;
  }
  const n = Number.parseInt(id, 10);
  return Number.isFinite(n) ? n : undefined;
}

async function flushBatch(rows: (typeof scoreSaberScoreHistoryTable.$inferInsert)[]): Promise<void> {
  if (rows.length === 0) {
    return;
  }
  await db.insert(scoreSaberScoreHistoryTable).values(rows);
}

async function main() {
  const limit = parseLimit(process.argv);
  const batchSize = parseBatchSize(process.argv);
  const playerIdFilter = parsePlayerIdFilter(process.argv);
  const leaderboardIdFilter = parseLeaderboardIdFilter(process.argv);

  await mongoose.connect(env.MONGO_CONNECTION_STRING);

  let processed = 0;
  let inserted = 0;
  let errors = 0;

  const batch: (typeof scoreSaberScoreHistoryTable.$inferInsert)[] = [];

  const query: Record<string, unknown> = {};
  if (playerIdFilter != null) {
    query.playerId = playerIdFilter;
  }
  if (leaderboardIdFilter != null) {
    query.leaderboardId = leaderboardIdFilter;
  }

  const cursor = ScoreSaberPreviousScoreModel.find(query).lean().cursor();

  async function flush() {
    if (batch.length === 0) {
      return;
    }
    const chunk = batch.splice(0, batch.length);
    try {
      await flushBatch(chunk);
      inserted += chunk.length;
    } catch (e) {
      errors += chunk.length;
      Logger.error(
        `[mongo-to-postgres] scoresaber-previous-scores batch failed (${chunk.length} rows): ${e}`
      );
    }
  }

  for await (const doc of cursor) {
    if (limit !== undefined && processed >= limit) {
      break;
    }
    processed++;

    try {
      batch.push(mongoPreviousScoreDocToRow(doc as MongoScoreSaberPreviousScoreLeanDoc));
      if (batch.length >= batchSize) {
        await flush();
      }
    } catch (e) {
      errors++;
      Logger.error(
        `[mongo-to-postgres] scoresaber-previous-scores map failed _id=${String((doc as MongoScoreSaberPreviousScoreLeanDoc)._id)}: ${e}`
      );
    }

    if (processed % 5000 === 0) {
      const filterNote = [
        playerIdFilter != null ? ` playerId=${playerIdFilter}` : "",
        leaderboardIdFilter != null ? ` leaderboardId=${leaderboardIdFilter}` : "",
      ].join("");
      Logger.info(
        `[mongo-to-postgres] scoresaber-previous-scores progress processed=${processed} inserted=${inserted} errors=${errors} (batchSize=${batchSize}${filterNote})`
      );
    }
  }

  await flush();
  await mongoose.disconnect();

  Logger.info(
    `[mongo-to-postgres] scoresaber-previous-scores done processed=${processed} inserted=${inserted} errors=${errors}`
  );
}

main().catch(e => {
  Logger.error(e);
  process.exit(1);
});
