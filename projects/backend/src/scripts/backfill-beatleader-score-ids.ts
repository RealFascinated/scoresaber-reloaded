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
  startId?: string;
  endId?: string;
  maxChunks?: number;
  includeExisting: boolean;
  keepCreatedIndexes: boolean;
  countMatchesInApply: boolean;
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
  lastProcessedId?: unknown;
};

type IdKind = "number" | "objectId";

function detectIdKind(idValue: unknown): IdKind {
  if (typeof idValue === "number") {
    return "number";
  }
  if (idValue instanceof mongoose.Types.ObjectId) {
    return "objectId";
  }
  throw new Error(`Unsupported _id type for chunking: ${typeof idValue}`);
}

function parseCliId(raw: string | undefined, kind: IdKind): unknown {
  if (raw == undefined) {
    return undefined;
  }
  if (kind === "number") {
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed)) {
      throw new Error(`Invalid numeric id value: ${raw}`);
    }
    return parsed;
  }
  if (!mongoose.Types.ObjectId.isValid(raw)) {
    throw new Error(`Invalid ObjectId value: ${raw}`);
  }
  return new mongoose.Types.ObjectId(raw);
}

function idToLogString(idValue: unknown): string {
  if (idValue == undefined) {
    return "n/a";
  }
  if (typeof idValue === "number") {
    return idValue.toString();
  }
  if (idValue instanceof mongoose.Types.ObjectId) {
    return idValue.toHexString();
  }
  return String(idValue);
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    apply: false,
    chunkSize: 250_000,
    startId: undefined,
    endId: undefined,
    maxChunks: undefined,
    includeExisting: false,
    keepCreatedIndexes: false,
    countMatchesInApply: false,
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
    if (arg === "--keep-created-indexes") {
      opts.keepCreatedIndexes = true;
      continue;
    }
    if (arg === "--count-matches-in-apply") {
      opts.countMatchesInApply = true;
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
      opts.startId = next;
      i++;
      continue;
    }
    if (arg === "--end-id") {
      const next = argv[i + 1];
      if (!next) throw new Error("--end-id requires a value");
      opts.endId = next;
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
  --keep-created-indexes  Keep temporary indexes created by this run
  --count-matches-in-apply  In apply mode, also run expensive pre-count of matched rows
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

async function ensureIndexIfMissing(
  collectionName: string,
  indexes: IndexDoc[],
  key: Record<string, 1 | -1>,
  keyPrefix: string[],
  indexName: string
): Promise<string | undefined> {
  if (hasPrefixIndex(indexes, keyPrefix)) {
    return undefined;
  }

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("MongoDB connection not established");
  }

  Logger.warn(`[Preflight] Missing index on ${collectionName}: (${keyPrefix.join(", ")}). Creating it now...`);
  const createdName = await db.collection(collectionName).createIndex(key, {
    name: indexName,
    background: true,
  });
  Logger.info(`[Preflight] Created index "${createdName}" on ${collectionName}`);
  return createdName;
}

async function preflightIndexChecks(): Promise<string[]> {
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

  const createdIndexes: string[] = [];

  if (!hasScoresRangeIndex) {
    Logger.warn("[Preflight] Missing _id index on scoresaber-scores. This is unexpected for MongoDB collections.");
  }

  const createdScoresMissingIndex = await ensureIndexIfMissing(
    SCORES_COLLECTION,
    scoreIndexes,
    { beatLeaderScoreId: 1, _id: 1 },
    ["beatLeaderScoreId", "_id"],
    "tmp_ssr_backfill_beatLeaderScoreId_id"
  );
  if (createdScoresMissingIndex) {
    createdIndexes.push(`${SCORES_COLLECTION}:${createdScoresMissingIndex}`);
  }

  if (!hasLeaderboardIdIndex) {
    Logger.warn("[Preflight] Missing _id index on scoresaber-leaderboards. This is unexpected for MongoDB collections.");
  }

  const createdBeatLeaderJoinIndex = await ensureIndexIfMissing(
    BEATLEADER_COLLECTION,
    beatLeaderIndexes,
    { playerId: 1, songHash: 1, songDifficulty: 1, songCharacteristic: 1, songScore: 1 },
    ["playerId", "songHash", "songDifficulty", "songCharacteristic", "songScore"],
    "tmp_ssr_backfill_bl_join_key"
  );
  if (createdBeatLeaderJoinIndex) {
    createdIndexes.push(`${BEATLEADER_COLLECTION}:${createdBeatLeaderJoinIndex}`);
  }

  return createdIndexes;
}

async function cleanupCreatedIndexes(createdIndexes: string[]): Promise<void> {
  if (createdIndexes.length === 0) {
    return;
  }

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("MongoDB connection not established");
  }

  for (const entry of createdIndexes) {
    const [collectionName, indexName] = entry.split(":");
    try {
      await db.collection(collectionName).dropIndex(indexName);
      Logger.info(`[Cleanup] Dropped temporary index "${indexName}" on ${collectionName}`);
    } catch (error) {
      Logger.warn(`[Cleanup] Failed to drop temporary index "${indexName}" on ${collectionName}: ${error}`);
    }
  }
}

async function getCollectionIdBounds(): Promise<{ minId: unknown; maxId: unknown; idKind: IdKind }> {
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

  const minId = minDoc._id;
  const maxId = maxDoc._id;
  const idKind = detectIdKind(minId);
  return { minId, maxId, idKind };
}

async function getNextChunkBounds(
  chunkSize: number,
  opts: CliOptions,
  idKind: IdKind,
  lastProcessedId: unknown
): Promise<{ chunkStart: unknown; chunkEnd: unknown } | undefined> {
  const collection = mongoose.connection.db?.collection(SCORES_COLLECTION);
  if (!collection) {
    throw new Error("MongoDB connection not established");
  }

  const startId = parseCliId(opts.startId, idKind);
  const endId = parseCliId(opts.endId, idKind);
  const idQuery: Record<string, unknown> = {};

  if (lastProcessedId != undefined) {
    idQuery.$gt = lastProcessedId;
  } else if (startId != undefined) {
    idQuery.$gte = startId;
  }
  if (endId != undefined) {
    idQuery.$lte = endId;
  }

  const query = Object.keys(idQuery).length > 0 ? { _id: idQuery } : {};
  const rows = await collection
    .find(query, { projection: { _id: 1 } })
    .sort({ _id: 1 })
    .limit(chunkSize)
    .toArray();

  if (rows.length === 0) {
    return undefined;
  }

  return { chunkStart: rows[0]._id, chunkEnd: rows[rows.length - 1]._id };
}

function formatElapsed(ms: number): string {
  if (ms < 1000) {
    return `${ms.toFixed(0)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

async function run(opts: CliOptions) {
  const { minId, maxId, idKind } = await getCollectionIdBounds();
  const createdIndexes = await preflightIndexChecks();

  const resolvedStartId = parseCliId(opts.startId, idKind) ?? minId;
  const resolvedEndId = parseCliId(opts.endId, idKind) ?? maxId;

  Logger.info(
    `[Run] Mode=${opts.apply ? "APPLY" : "DRY-RUN"}, chunkSize=${opts.chunkSize}, range=${idToLogString(resolvedStartId)}-${idToLogString(resolvedEndId)}${
      opts.maxChunks ? `, maxChunks=${opts.maxChunks}` : ""
    }, includeExisting=${opts.includeExisting}, keepCreatedIndexes=${opts.keepCreatedIndexes}, countMatchesInApply=${opts.countMatchesInApply}`
  );

  const totals: ProgressTotals = {
    chunksProcessed: 0,
    totalCandidates: 0,
    totalMatched: 0,
    startTimeMs: performance.now(),
    lastProcessedId: undefined,
  };

  while (true) {
    if (opts.maxChunks && totals.chunksProcessed >= opts.maxChunks) {
      Logger.info(`[Run] Reached --max-chunks=${opts.maxChunks}. Stopping.`);
      break;
    }

    const chunk = await getNextChunkBounds(opts.chunkSize, opts, idKind, totals.lastProcessedId);
    if (!chunk) {
      break;
    }
    const { chunkStart, chunkEnd } = chunk;
    const chunkTimerStart = performance.now();
    const baseMatch = buildChunkBaseMatch(chunkStart, chunkEnd, opts.includeExisting);

    const candidateCountPromise = countCandidates(baseMatch);
    const matchedCountPromise =
      !opts.apply || opts.countMatchesInApply ? countMatched(baseMatch) : Promise.resolve<number | undefined>(undefined);
    const [candidateCount, matchedCount] = await Promise.all([candidateCountPromise, matchedCountPromise]);

    if (opts.apply) {
      await applyChunkUpdates(baseMatch);
    }

    const chunkElapsedMs = performance.now() - chunkTimerStart;
    const rowsPerSec = chunkElapsedMs > 0 ? Math.round((candidateCount / chunkElapsedMs) * 1000) : candidateCount;

    totals.chunksProcessed++;
    totals.totalCandidates += candidateCount;
    if (matchedCount != undefined) {
      totals.totalMatched += matchedCount;
    }
    totals.lastProcessedId = chunkEnd;

    Logger.info(
      `[Chunk ${totals.chunksProcessed}] range=${idToLogString(chunkStart)}-${idToLogString(chunkEnd)}, candidates=${candidateCount}, matched=${
        matchedCount == undefined ? "skipped" : matchedCount
      }, ${opts.apply ? "updated" : "wouldUpdate"}=${
        matchedCount == undefined ? "unknown" : matchedCount
      }, elapsed=${formatElapsed(chunkElapsedMs)}, rate≈${rowsPerSec}/s, lastProcessedId=${idToLogString(chunkEnd)}`
    );

    totals.lastProcessedId = chunkEnd;
  }

  const totalElapsedMs = performance.now() - totals.startTimeMs;
  const totalRowsPerSec =
    totalElapsedMs > 0 ? Math.round((totals.totalCandidates / totalElapsedMs) * 1000) : totals.totalCandidates;

  Logger.info(
    `[Summary] chunks=${totals.chunksProcessed}, candidates=${totals.totalCandidates}, matched=${totals.totalMatched}, ${
      opts.apply ? "updated" : "wouldUpdate"
    }=${opts.apply && !opts.countMatchesInApply ? "unknown" : totals.totalMatched}, elapsed=${formatElapsed(totalElapsedMs)}, rate≈${totalRowsPerSec}/s, lastProcessedId=${
      idToLogString(totals.lastProcessedId)
    }`
  );

  if (opts.keepCreatedIndexes) {
    Logger.info("[Cleanup] Keeping created indexes because --keep-created-indexes was provided.");
    return;
  }
  await cleanupCreatedIndexes(createdIndexes);
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
