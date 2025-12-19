import * as dotenv from "@dotenvx/dotenvx";
import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { ScoreSaberMedalsScoreModel } from "@ssr/common/model/score/impl/scoresaber-medals-score";
import { ScoreSaberPreviousScoreModel } from "@ssr/common/model/score/impl/scoresaber-previous-score";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { ModifierLabels, normalizeModifier } from "@ssr/common/score/modifier";
import { mongoose } from "@typegoose/typegoose";

dotenv.config();

type CliOptions = {
  apply: boolean;
  batchSize: number;
  limit?: number;
  dropUnknown: boolean;
};

type BulkWriteOperation = {
  updateOne: {
    filter: Record<string, unknown>;
    update: { $set: Record<string, unknown> };
  };
};

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    apply: false,
    batchSize: 1000,
    limit: undefined,
    dropUnknown: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--apply") {
      opts.apply = true;
      continue;
    }
    if (arg === "--drop-unknown") {
      opts.dropUnknown = true;
      continue;
    }
    if (arg === "--batch-size") {
      const next = argv[i + 1];
      if (!next) throw new Error("--batch-size requires a value");
      opts.batchSize = Math.max(1, Number.parseInt(next, 10));
      i++;
      continue;
    }
    if (arg === "--limit") {
      const next = argv[i + 1];
      if (!next) throw new Error("--limit requires a value");
      opts.limit = Math.max(1, Number.parseInt(next, 10));
      i++;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      printHelpAndExit(0);
    }
  }

  return opts;
}

function printHelpAndExit(code: number): never {
  // Keep this as console output so it always prints, even if Logger config changes.
  console.log(
    `
Migrates legacy ScoreSaber modifier *labels* (e.g. "No Fail") to modifier *codes* (e.g. "NF").

Usage:
  bun run src/scripts/migrate-modifiers-to-codes.ts [--apply] [--batch-size N] [--limit N] [--drop-unknown]

Flags:
  --apply         Actually write changes (default: dry-run)
  --batch-size N  Bulk write batch size (default: 1000)
  --limit N       Stop after updating N docs (useful for testing)
  --drop-unknown  If a doc contains unknown modifier values, drop those values instead of skipping the doc
`.trim()
  );
  process.exit(code);
}

type AnyDoc = { _id: unknown; modifiers?: unknown };

type LeanCursor<T> = AsyncIterable<T>;

type ModelLike<TDoc> = {
  collection: { collectionName: string };
  find: (
    filter: Record<string, unknown>,
    projection: Record<string, 0 | 1>
  ) => {
    lean: () => {
      cursor: () => LeanCursor<TDoc>;
    };
  };
  bulkWrite: (
    ops: BulkWriteOperation[],
    options?: { ordered?: boolean }
  ) => Promise<{ modifiedCount?: number }>;
};

async function migrateModel(modelName: string, model: ModelLike<AnyDoc>, opts: CliOptions) {
  const legacyLabels = Object.values(ModifierLabels);

  const query = {
    modifiers: { $elemMatch: { $in: legacyLabels } },
  };

  Logger.info(
    `[${modelName}] scanning collection "${model.collection.collectionName}" for legacy labels...`
  );

  let scanned = 0;
  let matched = 0;
  let updated = 0;
  let skippedUnknown = 0;
  let noChange = 0;

  const ops: BulkWriteOperation[] = [];

  const cursor = model.find(query, { _id: 1, modifiers: 1 }).lean().cursor();

  let batchIndex = 0;
  let lastBatchAt = Date.now();

  async function flushBatch(): Promise<void> {
    if (ops.length === 0) {
      return;
    }

    batchIndex++;
    const batchSize = ops.length;
    const before = Date.now();

    if (opts.apply) {
      const res = await model.bulkWrite(ops, { ordered: false });
      updated += res.modifiedCount ?? 0;
    } else {
      updated += batchSize;
    }

    const after = Date.now();
    const batchMs = after - before;
    const sinceLastMs = after - lastBatchAt;
    lastBatchAt = after;

    const perSec = sinceLastMs > 0 ? Math.round((batchSize / sinceLastMs) * 1000) : batchSize;

    Logger.info(
      `[${modelName}] batch=${batchIndex} ops=${batchSize} ${
        opts.apply ? "modifiedTotal" : "wouldModifyTotal"
      }=${updated} scanned=${scanned} rate≈${perSec}/s batchMs=${batchMs} skippedUnknown=${skippedUnknown} noChange=${noChange}`
    );

    ops.length = 0;
  }

  for await (const doc of cursor) {
    scanned++;
    matched++;

    const raw = doc.modifiers;
    const values = Array.isArray(raw) ? raw : [];

    let hasUnknown = false;
    const next: string[] = [];

    for (const v of values) {
      if (typeof v !== "string") {
        hasUnknown = true;
        if (opts.dropUnknown) continue;
        break;
      }

      const normalized = normalizeModifier(v);
      if (!normalized) {
        hasUnknown = true;
        if (opts.dropUnknown) continue;
        break;
      }

      next.push(normalized);
    }

    if (hasUnknown && !opts.dropUnknown) {
      skippedUnknown++;
      continue;
    }

    // If the modifiers are already codes only (or normalize produced the same list), skip.
    const current = values.filter((v): v is string => typeof v === "string");
    const changed = current.length !== next.length || current.some((v, idx) => v !== next[idx]);

    if (!changed) {
      noChange++;
      continue;
    }

    ops.push({
      updateOne: {
        filter: { _id: doc._id as unknown },
        update: { $set: { modifiers: next } },
      },
    });

    if (ops.length >= opts.batchSize) {
      await flushBatch();

      if (opts.limit && updated >= opts.limit) break;
    }
  }

  if (!opts.limit || updated < opts.limit) {
    await flushBatch();
  }

  Logger.info(
    `[${modelName}] done. scanned=${scanned} matched=${matched} ${
      opts.apply ? "modified" : "wouldModify"
    }=${updated} skippedUnknown=${skippedUnknown} noChange=${noChange}`
  );
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  Logger.info(
    `Connecting to MongoDB... (${opts.apply ? "APPLY" : "DRY-RUN"}, batchSize=${opts.batchSize}${
      opts.limit ? `, limit=${opts.limit}` : ""
    }${opts.dropUnknown ? ", dropUnknown=true" : ""})`
  );
  await mongoose.connect(env.MONGO_CONNECTION_STRING);
  Logger.info("Connected to MongoDB");

  try {
    await migrateModel(
      "scoresaber-scores",
      ScoreSaberScoreModel as unknown as ModelLike<AnyDoc>,
      opts
    );
    await migrateModel(
      "scoresaber-previous-scores",
      ScoreSaberPreviousScoreModel as unknown as ModelLike<AnyDoc>,
      opts
    );
    await migrateModel(
      "scoresaber-medals-scores",
      ScoreSaberMedalsScoreModel as unknown as ModelLike<AnyDoc>,
      opts
    );
  } finally {
    await mongoose.disconnect();
    Logger.info("MongoDB connection closed");
  }
}

main().catch(error => {
  Logger.error("Fatal error:", error);
  process.exit(1);
});
