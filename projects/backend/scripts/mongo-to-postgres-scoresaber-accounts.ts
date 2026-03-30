import * as dotenv from "@dotenvx/dotenvx";
import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { PlayerModel } from "@ssr/common/model/player/player";
import type { ScoreSaberPlayerScoreStats } from "@ssr/common/schemas/scoresaber/player/score-stats";
import { mongoose } from "@typegoose/typegoose";
import { sql } from "drizzle-orm";
import { db } from "../src/db";
import { scoreSaberAccountsTable, type ScoreSaberAccountRow } from "../src/db/schema";

dotenv.config();

/** Lean Mongo document from `players` collection. */
type MongoPlayerLeanDoc = {
  _id: string;
  name?: string;
  country?: string;
  peakRank?: { rank?: number; date?: Date | string };
  seededScores?: boolean;
  seededBeatLeaderScores?: boolean;
  trackReplays?: boolean;
  inactive?: boolean;
  banned?: boolean;
  hmd?: string;
  pp?: number;
  medals?: number;
  scoreStats?: Partial<ScoreSaberPlayerScoreStats>;
  trackedSince?: Date | string;
  joinedDate?: Date | string;
  cachedProfilePicture?: boolean;
};

function defaultScoreStats(): ScoreSaberPlayerScoreStats {
  return {
    aPlays: 0,
    sPlays: 0,
    spPlays: 0,
    ssPlays: 0,
    sspPlays: 0,
    godPlays: 0,
  };
}

function normalizeScoreStats(
  raw: Partial<ScoreSaberPlayerScoreStats> | undefined
): ScoreSaberPlayerScoreStats {
  const d = defaultScoreStats();
  if (!raw) {
    return d;
  }
  return {
    aPlays: raw.aPlays ?? d.aPlays,
    sPlays: raw.sPlays ?? d.sPlays,
    spPlays: raw.spPlays ?? d.spPlays,
    ssPlays: raw.ssPlays ?? d.ssPlays,
    sspPlays: raw.sspPlays ?? d.sspPlays,
    godPlays: raw.godPlays ?? d.godPlays,
  };
}

function asDate(v: Date | string | undefined): Date | null {
  if (v == null) {
    return null;
  }
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function truncateVarchar32(s: string | undefined): string | null {
  if (s == null || s === "") {
    return null;
  }
  return s.length <= 32 ? s : s.slice(0, 32);
}

/** Maps Mongo `players` doc → Drizzle insert row for `scoresaber-accounts`. */
function mongoPlayerDocToRow(doc: MongoPlayerLeanDoc): typeof scoreSaberAccountsTable.$inferInsert {
  const tracked = asDate(doc.trackedSince);
  const joined = asDate(doc.joinedDate);
  const trackedSince = tracked ?? joined ?? new Date();
  const joinedDate = joined ?? tracked ?? new Date();

  const peakDate = doc.peakRank?.date != null ? asDate(doc.peakRank.date as Date | string) : null;

  return {
    id: doc._id,
    name: doc.name?.trim() || "Unknown",
    country: truncateVarchar32(doc.country ?? undefined) ?? null,
    peakRank: doc.peakRank?.rank ?? null,
    peakRankTimestamp: peakDate,
    seededScores: doc.seededScores ?? false,
    seededBeatLeaderScores: doc.seededBeatLeaderScores ?? false,
    cachedProfilePicture: doc.cachedProfilePicture ?? false,
    trackReplays: doc.trackReplays ?? false,
    inactive: doc.inactive ?? false,
    banned: doc.banned ?? false,
    hmd: truncateVarchar32(doc.hmd),
    pp: doc.pp ?? 0,
    medals: doc.medals ?? 0,
    scoreStats: normalizeScoreStats(doc.scoreStats),
    trackedSince,
    joinedDate,
  };
}

const accountUpsertSet: Record<Exclude<keyof ScoreSaberAccountRow, "id">, ReturnType<typeof sql>> = {
  name: sql`excluded."name"`,
  country: sql`excluded."country"`,
  peakRank: sql`excluded."peakRank"`,
  peakRankTimestamp: sql`excluded."peakRankTimestamp"`,
  seededScores: sql`excluded."seededScores"`,
  seededBeatLeaderScores: sql`excluded."seededBeatLeaderScores"`,
  cachedProfilePicture: sql`excluded."cachedProfilePicture"`,
  trackReplays: sql`excluded."trackReplays"`,
  inactive: sql`excluded."inactive"`,
  banned: sql`excluded."banned"`,
  hmd: sql`excluded."hmd"`,
  pp: sql`excluded."pp"`,
  medals: sql`excluded."medals"`,
  scoreStats: sql`excluded."scoreStats"`,
  trackedSince: sql`excluded."trackedSince"`,
  joinedDate: sql`excluded."joinedDate"`,
};

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

async function flushBatch(rows: (typeof scoreSaberAccountsTable.$inferInsert)[]): Promise<void> {
  if (rows.length === 0) {
    return;
  }
  await db.insert(scoreSaberAccountsTable).values(rows).onConflictDoUpdate({
    target: scoreSaberAccountsTable.id,
    set: accountUpsertSet,
  });
}

async function main() {
  const limit = parseLimit(process.argv);
  const batchSize = parseBatchSize(process.argv);

  await mongoose.connect(env.MONGO_CONNECTION_STRING);

  let processed = 0;
  let upserted = 0;
  let skipped = 0;
  let errors = 0;

  const batch: (typeof scoreSaberAccountsTable.$inferInsert)[] = [];

  const cursor = PlayerModel.find().lean().cursor();

  async function flush() {
    if (batch.length === 0) {
      return;
    }
    const chunk = batch.splice(0, batch.length);
    try {
      await flushBatch(chunk);
      upserted += chunk.length;
    } catch (e) {
      errors += chunk.length;
      Logger.error(`[mongo-to-postgres] scoresaber-accounts batch failed (${chunk.length} rows): ${e}`);
    }
  }

  for await (const doc of cursor) {
    if (limit !== undefined && processed >= limit) {
      break;
    }
    processed++;

    const rawId = (doc as MongoPlayerLeanDoc & { _id?: unknown })._id;
    const id = rawId == null ? "" : typeof rawId === "string" ? rawId : String(rawId);
    if (id.length === 0 || id.length > 32) {
      skipped++;
      continue;
    }

    try {
      batch.push(mongoPlayerDocToRow({ ...(doc as MongoPlayerLeanDoc), _id: id }));
      if (batch.length >= batchSize) {
        await flush();
      }
    } catch (e) {
      errors++;
      Logger.error(`[mongo-to-postgres] scoresaber-accounts map failed _id=${id}: ${e}`);
    }

    if (processed % 5000 === 0) {
      Logger.info(
        `[mongo-to-postgres] scoresaber-accounts progress processed=${processed} upserted=${upserted} skipped=${skipped} errors=${errors} (batchSize=${batchSize})`
      );
    }
  }

  await flush();
  await mongoose.disconnect();

  Logger.info(
    `[mongo-to-postgres] scoresaber-accounts done processed=${processed} upserted=${upserted} skipped=${skipped} errors=${errors}`
  );
}

main().catch(e => {
  Logger.error(e);
  process.exit(1);
});
