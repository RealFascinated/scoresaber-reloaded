import * as dotenv from "@dotenvx/dotenvx";
import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { mongoose } from "@typegoose/typegoose";

dotenv.config();

const SCORES_COLLECTION = "scoresaber-scores";
const LEADERBOARDS_COLLECTION = "scoresaber-leaderboards";
const BEATLEADER_COLLECTION = "additional-score-data";

type CliOptions = {
  apply: boolean;
  chunkSize: number;
  startId?: number;
  endId?: number;
  maxChunks?: number;
  includeExisting: boolean;
};

type IndexDoc = {
  name?: string;
  key: Record<string, 1 | -1 | "text">;
};

type ProgressTotals = {
  chunksProcessed: number;
  totalCandidates: number;
  totalMatched: number;
  startTimeMs: number;
  lastProcessedId?: number;
};

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    apply: false,
    chunkSize: 250_000,
    startId: undefined,
    endId: undefined,
    maxChunks: undefined,
    includeExisting: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--apply") {
      opts.apply = true;
      continue;
    }
    if (arg === "--include-existing") {
      opts.includeExisting = true;
      continue;
    }
    if (arg === "--chunk-size") {
      const next = argv[i + 1];
      if (!next) throw new Error("--chunk-size requires a value");
      opts.chunkSize = Math.max(1, Number.parseInt(next, 10));
      i++;
      continue;
    }
    if (arg === "--start-id") {
      const next = argv[i + 1];
      if (!next) throw new Error("--start-id requires a value");
      opts.startId = Math.max(1, Number.parseInt(next, 10));
      i++;
      continue;
    }
    if (arg === "--end-id") {
      const next = argv[i + 1];
      if (!next) throw new Error("--end-id requires a value");
      opts.endId = Math.max(1, Number.parseInt(next, 10));
      i++;
      continue;
    }
    if (arg === "--max-chunks") {
      const next = argv[i + 1];
      if (!next) throw new Error("--max-chunks requires a value");
      opts.maxChunks = Math.max(1, Number.parseInt(next, 10));
      i++;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      printHelpAndExit(0);
    }
  }

  if (opts.startId && opts.endId && opts.startId > opts.endId) {
    throw new Error("--start-id cannot be greater than --end-id");
  }

  return opts;
}

function printHelpAndExit(code: number): never {
  console.log(
    `
Backfills scoresaber-scores.beatLeaderScoreId by matching rows in additional-score-data.
Optimized for very large datasets using chunked, resumable aggregation ranges.

Usage:
  bun run src/scripts/backfill-beatleader-score-ids.ts [flags]

Flags:
  --apply             Write updates (default: dry-run)
  --chunk-size N      Chunk size by _id range (default: 250000)
  --start-id N        Start range at this _id (inclusive)
  --end-id N          Stop range at this _id (inclusive)
  --max-chunks N      Process at most N chunks this run
  --include-existing  Re-evaluate rows that already have beatLeaderScoreId
`.trim()
  );
  process.exit(code);
}

function hasMissingBeatLeaderScoreIdCondition() {
  return {
    $or: [{ beatLeaderScoreId: { $exists: false } }, { beatLeaderScoreId: null }],
  };
}

function buildChunkBaseMatch(rangeStart: number, rangeEnd: number, includeExisting: boolean) {
  const base: Record<string, unknown> = {
    _id: { $gte: rangeStart, $lte: rangeEnd },
  };
  if (!includeExisting) {
    base.$and = [hasMissingBeatLeaderScoreIdCondition()];
  }
  return base;
}

function buildUpdateCandidatePipeline(baseMatch: Record<string, unknown>): Record<string, unknown>[] {
  return [
    { $match: baseMatch },
    {
      $lookup: {
        from: LEADERBOARDS_COLLECTION,
        localField: "leaderboardId",
        foreignField: "_id",
        as: "leaderboard",
      },
    },
    {
      $unwind: {
        path: "$leaderboard",
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $set: {
        songHashUpper: { $toUpper: "$leaderboard.songHash" },
      },
    },
    {
      $lookup: {
        from: BEATLEADER_COLLECTION,
        let: {
          playerId: "$playerId",
          songHash: "$songHashUpper",
          songDifficulty: "$difficulty",
          songCharacteristic: "$characteristic",
          songScore: "$score",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$playerId", "$$playerId"] },
                  { $eq: ["$songHash", "$$songHash"] },
                  { $eq: ["$songDifficulty", "$$songDifficulty"] },
                  { $eq: ["$songCharacteristic", "$$songCharacteristic"] },
                  { $eq: ["$songScore", "$$songScore"] },
                ],
              },
            },
          },
          { $project: { _id: 0, scoreId: 1 } },
          { $limit: 1 },
        ],
        as: "matchedBeatLeader",
      },
    },
    {
      $set: {
        matchedBeatLeaderScoreId: { $first: "$matchedBeatLeader.scoreId" },
      },
    },
    {
      $match: {
        matchedBeatLeaderScoreId: { $type: "number" },
      },
    },
    {
      $match: {
        $expr: { $ne: ["$beatLeaderScoreId", "$matchedBeatLeaderScoreId"] },
      },
    },
    {
      $project: {
        _id: 1,
        beatLeaderScoreId: "$matchedBeatLeaderScoreId",
      },
    },
  ];
}

async function countCandidates(baseMatch: Record<string, unknown>): Promise<number> {
  const collection = mongoose.connection.db?.collection(SCORES_COLLECTION);
  if (!collection) {
    throw new Error("MongoDB connection not established");
  }
  return collection.countDocuments(baseMatch);
}

async function countMatched(baseMatch: Record<string, unknown>): Promise<number> {
  const collection = mongoose.connection.db?.collection(SCORES_COLLECTION);
  if (!collection) {
    throw new Error("MongoDB connection not established");
  }

  const pipeline = [...buildUpdateCandidatePipeline(baseMatch), { $count: "total" }];
  const result = await collection
    .aggregate<{ total: number }>(pipeline, {
      allowDiskUse: true,
    })
    .toArray();

  return result[0]?.total ?? 0;
}

async function applyChunkUpdates(baseMatch: Record<string, unknown>): Promise<void> {
  const collection = mongoose.connection.db?.collection(SCORES_COLLECTION);
  if (!collection) {
    throw new Error("MongoDB connection not established");
  }

  const pipeline = [
    ...buildUpdateCandidatePipeline(baseMatch),
    {
      $merge: {
        into: SCORES_COLLECTION,
        on: "_id",
        whenMatched: [
          {
            $set: {
              beatLeaderScoreId: "$$new.beatLeaderScoreId",
            },
          },
        ],
        whenNotMatched: "discard",
      },
    },
  ];

  await collection.aggregate(pipeline, { allowDiskUse: true }).toArray();
}

function hasPrefixIndex(indexes: IndexDoc[], keyPrefix: string[]): boolean {
  return indexes.some(index => {
    const keys = Object.keys(index.key);
    if (keys.length < keyPrefix.length) {
      return false;
    }
    return keyPrefix.every((field, idx) => keys[idx] === field);
  });
}

async function preflightIndexChecks() {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("MongoDB connection not established");
  }

  const [scoreIndexes, leaderboardIndexes, beatLeaderIndexes] = await Promise.all([
    db.collection(SCORES_COLLECTION).indexes() as Promise<IndexDoc[]>,
    db.collection(LEADERBOARDS_COLLECTION).indexes() as Promise<IndexDoc[]>,
    db.collection(BEATLEADER_COLLECTION).indexes() as Promise<IndexDoc[]>,
  ]);

  const hasScoresRangeIndex = hasPrefixIndex(scoreIndexes, ["_id"]);
  const hasScoresMissingIndex = hasPrefixIndex(scoreIndexes, ["beatLeaderScoreId", "_id"]);
  const hasLeaderboardIdIndex = hasPrefixIndex(leaderboardIndexes, ["_id"]);
  const hasBeatLeaderJoinIndex = hasPrefixIndex(beatLeaderIndexes, [
    "playerId",
    "songHash",
    "songDifficulty",
    "songCharacteristic",
    "songScore",
  ]);

  Logger.info(
    `[Preflight] Indexes: scores(_id)=${hasScoresRangeIndex}, scores(beatLeaderScoreId,_id)=${hasScoresMissingIndex}, leaderboards(_id)=${hasLeaderboardIdIndex}, beatleader(joinKey)=${hasBeatLeaderJoinIndex}`
  );

  if (!hasBeatLeaderJoinIndex) {
    Logger.warn(
      "[Preflight] Missing recommended BeatLeader join index prefix: (playerId, songHash, songDifficulty, songCharacteristic, songScore). Backfill may be significantly slower."
    );
  }

  if (!hasScoresMissingIndex) {
    Logger.warn(
      "[Preflight] Missing optional index prefix on scoresaber-scores: (beatLeaderScoreId, _id). Scanning missing rows may be slower."
    );
  }
}

async function getRunRange(opts: CliOptions): Promise<{ startId: number; endId: number }> {
  const collection = mongoose.connection.db?.collection(SCORES_COLLECTION);
  if (!collection) {
    throw new Error("MongoDB connection not established");
  }

  const [minDoc, maxDoc] = await Promise.all([
    collection.find({}, { projection: { _id: 1 } }).sort({ _id: 1 }).limit(1).next(),
    collection.find({}, { projection: { _id: 1 } }).sort({ _id: -1 }).limit(1).next(),
  ]);

  if (!minDoc?._id || !maxDoc?._id) {
    throw new Error(`Collection "${SCORES_COLLECTION}" is empty`);
  }

  const minId = Number(minDoc._id);
  const maxId = Number(maxDoc._id);
  const startId = Math.max(opts.startId ?? minId, minId);
  const endId = Math.min(opts.endId ?? maxId, maxId);

  if (startId > endId) {
    throw new Error(`Invalid range after bounds resolution: start=${startId}, end=${endId}`);
  }

  return { startId, endId };
}

function formatElapsed(ms: number): string {
  if (ms < 1000) {
    return `${ms.toFixed(0)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

async function run(opts: CliOptions) {
  const { startId, endId } = await getRunRange(opts);
  await preflightIndexChecks();

  Logger.info(
    `[Run] Mode=${opts.apply ? "APPLY" : "DRY-RUN"}, chunkSize=${opts.chunkSize}, range=${startId}-${endId}${
      opts.maxChunks ? `, maxChunks=${opts.maxChunks}` : ""
    }, includeExisting=${opts.includeExisting}`
  );

  const totals: ProgressTotals = {
    chunksProcessed: 0,
    totalCandidates: 0,
    totalMatched: 0,
    startTimeMs: performance.now(),
    lastProcessedId: undefined,
  };

  let chunkStart = startId;
  while (chunkStart <= endId) {
    if (opts.maxChunks && totals.chunksProcessed >= opts.maxChunks) {
      Logger.info(`[Run] Reached --max-chunks=${opts.maxChunks}. Stopping.`);
      break;
    }

    const chunkEnd = Math.min(endId, chunkStart + opts.chunkSize - 1);
    const chunkTimerStart = performance.now();
    const baseMatch = buildChunkBaseMatch(chunkStart, chunkEnd, opts.includeExisting);

    const [candidateCount, matchedCount] = await Promise.all([
      countCandidates(baseMatch),
      countMatched(baseMatch),
    ]);

    if (opts.apply && matchedCount > 0) {
      await applyChunkUpdates(baseMatch);
    }

    const chunkElapsedMs = performance.now() - chunkTimerStart;
    const rowsPerSec = chunkElapsedMs > 0 ? Math.round((candidateCount / chunkElapsedMs) * 1000) : candidateCount;

    totals.chunksProcessed++;
    totals.totalCandidates += candidateCount;
    totals.totalMatched += matchedCount;
    totals.lastProcessedId = chunkEnd;

    Logger.info(
      `[Chunk ${totals.chunksProcessed}] range=${chunkStart}-${chunkEnd}, candidates=${candidateCount}, matched=${matchedCount}, ${
        opts.apply ? "updated" : "wouldUpdate"
      }=${matchedCount}, elapsed=${formatElapsed(chunkElapsedMs)}, rate≈${rowsPerSec}/s, lastProcessedId=${chunkEnd}`
    );

    chunkStart = chunkEnd + 1;
  }

  const totalElapsedMs = performance.now() - totals.startTimeMs;
  const totalRowsPerSec =
    totalElapsedMs > 0 ? Math.round((totals.totalCandidates / totalElapsedMs) * 1000) : totals.totalCandidates;

  Logger.info(
    `[Summary] chunks=${totals.chunksProcessed}, candidates=${totals.totalCandidates}, matched=${totals.totalMatched}, ${
      opts.apply ? "updated" : "wouldUpdate"
    }=${totals.totalMatched}, elapsed=${formatElapsed(totalElapsedMs)}, rate≈${totalRowsPerSec}/s, lastProcessedId=${
      totals.lastProcessedId ?? "n/a"
    }`
  );
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  Logger.info("Connecting to MongoDB...");
  await mongoose.connect(env.MONGO_CONNECTION_STRING);
  Logger.info("Connected to MongoDB");

  try {
    await run(opts);
  } finally {
    await mongoose.disconnect();
    Logger.info("MongoDB connection closed");
  }
}

main().catch(error => {
  Logger.error("Fatal error:", error);
  process.exit(1);
});
