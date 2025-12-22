import * as dotenv from "@dotenvx/dotenvx";
import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { BeatLeaderScoreModel } from "@ssr/common/model/beatleader-score/beatleader-score";
import { mongoose } from "@typegoose/typegoose";

dotenv.config();

type CliOptions = {
  apply: boolean;
  batchSize: number;
  limit?: number;
};

type BulkWriteOperation = {
  deleteOne: {
    filter: Record<string, unknown>;
  };
};

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    apply: false,
    batchSize: 1000,
    limit: undefined,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--apply") {
      opts.apply = true;
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
Finds and deletes duplicate scoreIds in the additional-score-data collection.
For each duplicate group, keeps the document with the latest timestamp (or highest _id if timestamps are equal).

Usage:
  bun run src/scripts/delete-duplicate-scoreids.ts [--apply] [--batch-size N] [--limit N]

Flags:
  --apply         Actually delete duplicates (default: dry-run)
  --batch-size N  Bulk delete batch size (default: 1000)
  --limit N       Stop after deleting N duplicates (useful for testing)
`.trim()
  );
  process.exit(code);
}

type AnyDoc = { _id: unknown; scoreId?: unknown; timestamp?: unknown };

type ModelLike<TDoc> = {
  collection: {
    collectionName: string;
    aggregate: <T = TDoc>(
      pipeline: unknown[]
    ) => {
      toArray: () => Promise<T[]>;
    };
  };
  bulkWrite: (
    ops: BulkWriteOperation[],
    options?: { ordered?: boolean }
  ) => Promise<{ deletedCount?: number }>;
};

async function processDuplicates(modelName: string, model: ModelLike<AnyDoc>, opts: CliOptions) {
  Logger.info(
    `[${modelName}] scanning collection "${model.collection.collectionName}" for duplicate scoreIds...`
  );

  // Use aggregation to find duplicates
  // Group by scoreId, count occurrences, and get the _id of the document to keep (latest timestamp)
  const duplicatePipeline = [
    {
      $match: {
        scoreId: { $exists: true, $ne: null },
      },
    },
    {
      $sort: {
        scoreId: 1,
        timestamp: -1,
        _id: -1,
      },
    },
    {
      $group: {
        _id: "$scoreId",
        docs: {
          $push: {
            _id: "$_id",
            timestamp: "$timestamp",
          },
        },
        count: { $sum: 1 },
      },
    },
    {
      $match: {
        count: { $gt: 1 },
      },
    },
    {
      $project: {
        scoreId: "$_id",
        keepId: { $arrayElemAt: ["$docs._id", 0] },
        deleteIds: { $slice: ["$docs", 1, { $subtract: ["$count", 1] }] },
      },
    },
    {
      $unwind: "$deleteIds",
    },
    {
      $project: {
        _id: "$deleteIds._id",
        scoreId: 1,
      },
    },
  ];

  const duplicates = await model.collection
    .aggregate<{ _id: unknown; scoreId: unknown }>(duplicatePipeline)
    .toArray();

  Logger.info(`[${modelName}] found ${duplicates.length} duplicate documents to delete`);

  if (duplicates.length === 0) {
    Logger.info(`[${modelName}] no duplicates found`);
    return;
  }

  let deleted = 0;
  const ops: BulkWriteOperation[] = [];

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
      deleted += res.deletedCount ?? 0;
    } else {
      deleted += batchSize;
    }

    const after = Date.now();
    const batchMs = after - before;
    const sinceLastMs = after - lastBatchAt;
    lastBatchAt = after;

    const perSec = sinceLastMs > 0 ? Math.round((batchSize / sinceLastMs) * 1000) : batchSize;

    Logger.info(
      `[${modelName}] batch=${batchIndex} ops=${batchSize} ${
        opts.apply ? "deletedTotal" : "wouldDeleteTotal"
      }=${deleted} rate≈${perSec}/s batchMs=${batchMs}`
    );

    ops.length = 0;
  }

  for (const dup of duplicates) {
    ops.push({
      deleteOne: {
        filter: { _id: dup._id },
      },
    });

    if (ops.length >= opts.batchSize) {
      await flushBatch();

      if (opts.limit && deleted >= opts.limit) break;
    }
  }

  if (!opts.limit || deleted < opts.limit) {
    await flushBatch();
  }

  Logger.info(
    `[${modelName}] done. found=${duplicates.length} ${opts.apply ? "deleted" : "wouldDelete"}=${deleted}`
  );
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  Logger.info(
    `Connecting to MongoDB... (${opts.apply ? "APPLY" : "DRY-RUN"}, batchSize=${opts.batchSize}${
      opts.limit ? `, limit=${opts.limit}` : ""
    })`
  );
  await mongoose.connect(env.MONGO_CONNECTION_STRING);
  Logger.info("Connected to MongoDB");

  try {
    await processDuplicates(
      "additional-score-data",
      BeatLeaderScoreModel as unknown as ModelLike<AnyDoc>,
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
