import * as dotenv from "@dotenvx/dotenvx";
import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { mongoose } from "@typegoose/typegoose";
import { db } from "backend/db";
import { metricsTable, type MetricRow } from "backend/db/schema";
import { sql } from "drizzle-orm";
import { MetricValueModel } from "../src/model/metric/metric";

dotenv.config();

/** Lean Mongo document from `metrics` collection. */
type MongoMetricLeanDoc = {
  _id?: unknown;
  value?: unknown;
};

function truncateMetricId(raw: unknown): string | null {
  if (raw == null) {
    return null;
  }
  const id = typeof raw === "string" ? raw : String(raw);
  if (id.length === 0 || id.length > 64) {
    return null;
  }
  return id;
}

function canSerializeToJson(value: unknown): boolean {
  try {
    JSON.stringify(value);
    return true;
  } catch {
    return false;
  }
}

function mongoMetricDocToRow(doc: MongoMetricLeanDoc): typeof metricsTable.$inferInsert {
  const id = truncateMetricId(doc._id);
  if (id == null) {
    throw new Error("missing or invalid _id");
  }

  const value = doc.value === undefined ? null : doc.value;
  if (!canSerializeToJson(value)) {
    throw new Error("value is not JSON-serializable");
  }

  return {
    id,
    value,
  };
}

const metricsUpsertSet: Record<Exclude<keyof MetricRow, "id">, ReturnType<typeof sql>> = {
  value: sql`excluded."value"`,
  updatedAt: sql`now()`,
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

async function flushBatch(rows: (typeof metricsTable.$inferInsert)[]): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  await db.insert(metricsTable).values(rows).onConflictDoUpdate({
    target: metricsTable.id,
    set: metricsUpsertSet,
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

  const batch: (typeof metricsTable.$inferInsert)[] = [];
  const cursor = MetricValueModel.find().lean().cursor();

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
      Logger.error(`[mongo-to-postgres] metrics batch failed (${chunk.length} rows): ${e}`);
    }
  }

  for await (const doc of cursor) {
    if (limit !== undefined && processed >= limit) {
      break;
    }
    processed++;

    try {
      const row = mongoMetricDocToRow(doc as MongoMetricLeanDoc);
      batch.push(row);
      if (batch.length >= batchSize) {
        await flush();
      }
    } catch (e) {
      const rawId = (doc as MongoMetricLeanDoc)._id;
      if (String(e).includes("invalid _id")) {
        skipped++;
      } else {
        errors++;
      }
      Logger.error(`[mongo-to-postgres] metrics map failed _id=${String(rawId)}: ${e}`);
    }

    if (processed % 5000 === 0) {
      Logger.info(
        `[mongo-to-postgres] metrics progress processed=${processed} upserted=${upserted} skipped=${skipped} errors=${errors} (batchSize=${batchSize})`
      );
    }
  }

  await flush();
  await mongoose.disconnect();

  Logger.info(
    `[mongo-to-postgres] metrics done processed=${processed} upserted=${upserted} skipped=${skipped} errors=${errors}`
  );
}

main().catch(e => {
  Logger.error(e);
  process.exit(1);
});
