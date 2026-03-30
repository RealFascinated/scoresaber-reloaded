import * as dotenv from "@dotenvx/dotenvx";
import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { mongoose } from "@typegoose/typegoose";
import { db } from "backend/db";
import { scoreSaberLeaderboardStarChangeTable } from "backend/db/schema";
import { ScoreSaberLeaderboardStarChangeModel } from "../src/model/leaderboard/leaderboard-star-change";

dotenv.config();

/** Lean Mongo document from `scoresaber-leaderboard-star-change` collection. */
type MongoStarChangeLeanDoc = {
  _id?: unknown;
  leaderboardId?: unknown;
  previousStars?: unknown;
  newStars?: unknown;
  timestamp?: Date | string;
};

function asDate(v: Date | string | undefined | null): Date | null {
  if (v == null) {
    return null;
  }
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function asFiniteNumber(v: unknown, field: string): number {
  if (typeof v === "number" && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number.parseFloat(v);
    if (Number.isFinite(n)) {
      return n;
    }
  }
  throw new Error(`invalid ${field}`);
}

function asLeaderboardId(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.trunc(raw);
  }
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n)) {
      return n;
    }
  }
  throw new Error("invalid leaderboardId");
}

/** Maps Mongo doc → Drizzle insert row (`id` is serial in Postgres). */
function mongoStarChangeDocToRow(
  doc: MongoStarChangeLeanDoc
): typeof scoreSaberLeaderboardStarChangeTable.$inferInsert {
  const timestamp = asDate(doc.timestamp);
  if (timestamp == null) {
    throw new Error("missing or invalid timestamp");
  }
  return {
    leaderboardId: asLeaderboardId(doc.leaderboardId),
    previousStars: asFiniteNumber(doc.previousStars, "previousStars"),
    newStars: asFiniteNumber(doc.newStars, "newStars"),
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

async function flushBatch(rows: (typeof scoreSaberLeaderboardStarChangeTable.$inferInsert)[]): Promise<void> {
  if (rows.length === 0) {
    return;
  }
  await db.insert(scoreSaberLeaderboardStarChangeTable).values(rows);
}

async function main() {
  const limit = parseLimit(process.argv);
  const batchSize = parseBatchSize(process.argv);
  const leaderboardIdFilter = parseLeaderboardIdFilter(process.argv);

  await mongoose.connect(env.MONGO_CONNECTION_STRING);

  let processed = 0;
  let inserted = 0;
  let errors = 0;

  const batch: (typeof scoreSaberLeaderboardStarChangeTable.$inferInsert)[] = [];

  const query = leaderboardIdFilter != null ? { leaderboardId: leaderboardIdFilter } : {};
  const cursor = ScoreSaberLeaderboardStarChangeModel.find(query).lean().cursor();

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
      Logger.error(`[mongo-to-postgres] scoresaber-leaderboard-star-change batch failed (${chunk.length} rows): ${e}`);
    }
  }

  for await (const doc of cursor) {
    if (limit !== undefined && processed >= limit) {
      break;
    }
    processed++;

    try {
      batch.push(mongoStarChangeDocToRow(doc as MongoStarChangeLeanDoc));
      if (batch.length >= batchSize) {
        await flush();
      }
    } catch (e) {
      errors++;
      const id = (doc as MongoStarChangeLeanDoc)._id;
      Logger.error(`[mongo-to-postgres] scoresaber-leaderboard-star-change map failed _id=${String(id)}: ${e}`);
    }

    if (processed % 5000 === 0) {
      Logger.info(
        `[mongo-to-postgres] scoresaber-leaderboard-star-change progress processed=${processed} inserted=${inserted} errors=${errors} (batchSize=${batchSize}${leaderboardIdFilter != null ? ` leaderboardId=${leaderboardIdFilter}` : ""})`
      );
    }
  }

  await flush();
  await mongoose.disconnect();

  Logger.info(
    `[mongo-to-postgres] scoresaber-leaderboard-star-change done processed=${processed} inserted=${inserted} errors=${errors}`
  );
}

main().catch(e => {
  Logger.error(e);
  process.exit(1);
});
