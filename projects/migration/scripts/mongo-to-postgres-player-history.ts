import * as dotenv from "@dotenvx/dotenvx";
import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { mongoose } from "@typegoose/typegoose";
import { db } from "backend/db";
import { playerHistoryTable, type PlayerHistoryRow } from "backend/db/schema";
import { sql } from "drizzle-orm";
import { PlayerHistoryEntryModel } from "../src/model/player/player-history-entry";

dotenv.config();

/** Lean Mongo document from `player-history` collection. */
type MongoPlayerHistoryLeanDoc = {
  _id?: unknown;
  playerId?: unknown;
  date?: Date | string;
  rank?: number;
  countryRank?: number;
  medals?: number;
  pp?: number;
  plusOnePp?: number;
  totalScore?: number;
  totalRankedScore?: number;
  rankedScores?: number;
  unrankedScores?: number;
  rankedScoresImproved?: number;
  unrankedScoresImproved?: number;
  totalRankedScores?: number;
  totalUnrankedScores?: number;
  totalScores?: number;
  averageRankedAccuracy?: number;
  averageUnrankedAccuracy?: number;
  averageAccuracy?: number;
  aPlays?: number;
  sPlays?: number;
  spPlays?: number;
  ssPlays?: number;
  sspPlays?: number;
  godPlays?: number;
};

function asDate(v: Date | string | undefined | null): Date | null {
  if (v == null) {
    return null;
  }
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function truncatePlayerId(raw: unknown): string | null {
  if (raw == null) {
    return null;
  }
  const s = typeof raw === "string" ? raw : String(raw);
  if (s.length === 0 || s.length > 32) {
    return null;
  }
  return s;
}

/** Maps Mongo `player-history` doc → Drizzle insert row for `"player-history"` (no `id`; serial). */
function mongoPlayerHistoryDocToRow(doc: MongoPlayerHistoryLeanDoc): typeof playerHistoryTable.$inferInsert {
  const playerId = truncatePlayerId(doc.playerId);
  if (playerId == null) {
    throw new Error("missing or invalid playerId");
  }
  const date = asDate(doc.date);
  if (date == null) {
    throw new Error("missing or invalid date");
  }

  return {
    playerId,
    date,
    rank: doc.rank ?? null,
    countryRank: doc.countryRank ?? null,
    medals: doc.medals ?? null,
    pp: doc.pp ?? null,
    plusOnePp: doc.plusOnePp ?? null,
    totalScore: doc.totalScore ?? null,
    totalRankedScore: doc.totalRankedScore ?? null,
    rankedScores: doc.rankedScores ?? null,
    unrankedScores: doc.unrankedScores ?? null,
    rankedScoresImproved: doc.rankedScoresImproved ?? null,
    unrankedScoresImproved: doc.unrankedScoresImproved ?? null,
    totalRankedScores: doc.totalRankedScores ?? null,
    totalUnrankedScores: doc.totalUnrankedScores ?? null,
    totalScores: doc.totalScores ?? null,
    averageRankedAccuracy: doc.averageRankedAccuracy ?? null,
    averageUnrankedAccuracy: doc.averageUnrankedAccuracy ?? null,
    averageAccuracy: doc.averageAccuracy ?? null,
    aPlays: doc.aPlays ?? null,
    sPlays: doc.sPlays ?? null,
    spPlays: doc.spPlays ?? null,
    ssPlays: doc.ssPlays ?? null,
    sspPlays: doc.sspPlays ?? null,
    godPlays: doc.godPlays ?? null,
  };
}

const playerHistoryUpsertSet: Record<
  Exclude<keyof PlayerHistoryRow, "id" | "playerId" | "date">,
  ReturnType<typeof sql>
> = {
  rank: sql`excluded."rank"`,
  countryRank: sql`excluded."countryRank"`,
  medals: sql`excluded."medals"`,
  pp: sql`excluded."pp"`,
  plusOnePp: sql`excluded."plusOnePp"`,
  totalScore: sql`excluded."totalScore"`,
  totalRankedScore: sql`excluded."totalRankedScore"`,
  rankedScores: sql`excluded."rankedScores"`,
  unrankedScores: sql`excluded."unrankedScores"`,
  rankedScoresImproved: sql`excluded."rankedScoresImproved"`,
  unrankedScoresImproved: sql`excluded."unrankedScoresImproved"`,
  totalRankedScores: sql`excluded."totalRankedScores"`,
  totalUnrankedScores: sql`excluded."totalUnrankedScores"`,
  totalScores: sql`excluded."totalScores"`,
  averageRankedAccuracy: sql`excluded."averageRankedAccuracy"`,
  averageUnrankedAccuracy: sql`excluded."averageUnrankedAccuracy"`,
  averageAccuracy: sql`excluded."averageAccuracy"`,
  aPlays: sql`excluded."aPlays"`,
  sPlays: sql`excluded."sPlays"`,
  spPlays: sql`excluded."spPlays"`,
  ssPlays: sql`excluded."ssPlays"`,
  sspPlays: sql`excluded."sspPlays"`,
  godPlays: sql`excluded."godPlays"`,
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

/** Optional `--player-id=7656119...` to migrate rows for a single player only. */
function parsePlayerIdFilter(argv: string[]): string | undefined {
  const raw = argv.find(a => a.startsWith("--player-id="));
  if (!raw) {
    return undefined;
  }
  const id = raw.slice("--player-id=".length).trim();
  return id.length > 0 ? id : undefined;
}

async function flushBatch(rows: (typeof playerHistoryTable.$inferInsert)[]): Promise<void> {
  if (rows.length === 0) {
    return;
  }
  await db
    .insert(playerHistoryTable)
    .values(rows)
    .onConflictDoUpdate({
      target: [playerHistoryTable.playerId, playerHistoryTable.date],
      set: playerHistoryUpsertSet,
    });
}

async function main() {
  const limit = parseLimit(process.argv);
  const batchSize = parseBatchSize(process.argv);
  const playerIdFilter = parsePlayerIdFilter(process.argv);

  await mongoose.connect(env.MONGO_CONNECTION_STRING);

  let processed = 0;
  let upserted = 0;
  let errors = 0;

  const batch: (typeof playerHistoryTable.$inferInsert)[] = [];

  const query = playerIdFilter != null ? { playerId: playerIdFilter } : {};
  const cursor = PlayerHistoryEntryModel.find(query).lean().cursor();

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
      Logger.error(`[mongo-to-postgres] player-history batch failed (${chunk.length} rows): ${e}`);
    }
  }

  for await (const doc of cursor) {
    if (limit !== undefined && processed >= limit) {
      break;
    }
    processed++;

    try {
      batch.push(mongoPlayerHistoryDocToRow(doc as MongoPlayerHistoryLeanDoc));
      if (batch.length >= batchSize) {
        await flush();
      }
    } catch (e) {
      errors++;
      const id = (doc as MongoPlayerHistoryLeanDoc)._id;
      Logger.error(`[mongo-to-postgres] player-history map failed _id=${String(id)}: ${e}`);
    }

    if (processed % 5000 === 0) {
      Logger.info(
        `[mongo-to-postgres] player-history progress processed=${processed} upserted=${upserted} errors=${errors} (batchSize=${batchSize}${playerIdFilter ? ` playerId=${playerIdFilter}` : ""})`
      );
    }
  }

  await flush();
  await mongoose.disconnect();

  Logger.info(
    `[mongo-to-postgres] player-history done processed=${processed} upserted=${upserted} errors=${errors}`
  );
}

main().catch(e => {
  Logger.error(e);
  process.exit(1);
});
