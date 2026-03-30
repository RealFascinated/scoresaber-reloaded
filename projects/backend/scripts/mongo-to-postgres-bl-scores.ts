import * as dotenv from "@dotenvx/dotenvx";
import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { BeatLeaderScoreModel } from "@ssr/common/model/beatleader-score/beatleader-score";
import type { BeatLeaderScoreImprovementToken } from "@ssr/common/schemas/beatleader/tokens/score/score-improvement";
import { mongoose } from "@typegoose/typegoose";
import { sql } from "drizzle-orm";
import { db } from "../src/db";
import { beatLeaderScoresTable, type BeatLeaderScoreRow } from "../src/db/schema";

dotenv.config();

/** Lean Mongo document from `additional-score-data`. */
type MongoBeatLeaderLeanDoc = {
  scoreId: number;
  playerId: string;
  songHash: string;
  songDifficulty: string;
  songCharacteristic: string;
  songScore: number;
  leaderboardId?: string;
  pauses?: number;
  fcAccuracy: number;
  fullCombo: boolean;
  savedReplay?: boolean;
  timestamp: Date;
  misses?: {
    misses: number;
    missedNotes: number;
    bombCuts: number;
    wallsHit: number;
    badCuts: number;
  };
  handAccuracy?: { left: number; right: number };
  scoreImprovement?: {
    score: number;
    accuracy?: number;
    pauses?: number;
    misses?: {
      missedNotes?: number;
      bombCuts?: number;
      badCuts?: number;
      wallsHit?: number;
    };
    handAccuracy?: { left?: number; right?: number };
  };
};

function fcAccuracyToApiScale(fc: number): number {
  if (fc > 1) {
    return fc / 100;
  }
  return fc;
}

function mongoImprovementToToken(
  imp: MongoBeatLeaderLeanDoc["scoreImprovement"] | null | undefined,
  scoreId: number
): BeatLeaderScoreImprovementToken {
  if (!imp || imp.score <= 0) {
    return {
      id: scoreId,
      timeset: 0,
      score: 0,
      accuracy: 0,
      pp: 0,
      bonusPp: 0,
      rank: 0,
      accRight: 0,
      accLeft: 0,
      averageRankedAccuracy: 0,
      totalPp: 0,
      totalRank: 0,
      badCuts: 0,
      missedNotes: 0,
      bombCuts: 0,
      wallsHit: 0,
      pauses: 0,
    };
  }
  const ms = imp.misses;
  return {
    id: scoreId,
    timeset: 0,
    score: imp.score,
    accuracy: imp.accuracy ?? 0,
    pp: 0,
    bonusPp: 0,
    rank: 0,
    accRight: imp.handAccuracy?.right ?? 0,
    accLeft: imp.handAccuracy?.left ?? 0,
    averageRankedAccuracy: 0,
    totalPp: 0,
    totalRank: 0,
    badCuts: ms?.badCuts ?? 0,
    missedNotes: ms?.missedNotes ?? 0,
    bombCuts: ms?.bombCuts ?? 0,
    wallsHit: ms?.wallsHit ?? 0,
    pauses: imp.pauses ?? 0,
  };
}

/** Maps Mongo doc → Drizzle insert row (same numbers as {@link BeatLeaderService.trackBeatLeaderScore} insert, without replay fetch). */
function mongoBeatLeaderDocToRow(doc: MongoBeatLeaderLeanDoc): typeof beatLeaderScoresTable.$inferInsert {
  const misses = doc.misses ?? {
    misses: 0,
    missedNotes: 0,
    bombCuts: 0,
    wallsHit: 0,
    badCuts: 0,
  };
  const hand = doc.handAccuracy ?? { left: 0, right: 0 };
  const fcApi = fcAccuracyToApiScale(doc.fcAccuracy);
  const impTok = mongoImprovementToToken(doc.scoreImprovement, doc.scoreId);
  const getMissesImp = () => impTok.missedNotes + impTok.badCuts + impTok.bombCuts;
  const mainMisses = misses.missedNotes + misses.badCuts + misses.bombCuts;

  const improvement =
    impTok.score <= 0
      ? {
        improvementScore: 0,
        improvementPauses: 0,
        improvementMisses: 0,
        improvementMissedNotes: 0,
        improvementBombCuts: 0,
        improvementWallsHit: 0,
        improvementBadCuts: 0,
        improvementLeftHandAccuracy: 0,
        improvementRightHandAccuracy: 0,
      }
      : {
        improvementScore: impTok.score,
        improvementPauses: impTok.pauses,
        improvementMisses: getMissesImp(),
        improvementMissedNotes: impTok.missedNotes,
        improvementBombCuts: impTok.bombCuts,
        improvementWallsHit: impTok.wallsHit,
        improvementBadCuts: impTok.badCuts,
        improvementLeftHandAccuracy: impTok.accLeft,
        improvementRightHandAccuracy: impTok.accRight,
      };

  return {
    id: doc.scoreId,
    playerId: doc.playerId,
    songHash: String(doc.songHash).toUpperCase(),
    leaderboardId: String(doc.leaderboardId ?? ""),
    songDifficulty: String(doc.songDifficulty),
    songCharacteristic: String(doc.songCharacteristic),
    songScore: doc.songScore,
    pauses: doc.pauses ?? 0,
    fcAccuracy: fcApi * 100,
    fullCombo: doc.fullCombo,
    savedReplay: doc.savedReplay ?? false,
    leftHandAccuracy: hand.left,
    rightHandAccuracy: hand.right,
    misses: mainMisses,
    missedNotes: misses.missedNotes,
    bombCuts: misses.bombCuts,
    wallsHit: misses.wallsHit,
    badCuts: misses.badCuts,
    ...improvement,
    timestamp: doc.timestamp,
  };
}

const beatLeaderUpsertSet: Record<Exclude<keyof BeatLeaderScoreRow, "id">, ReturnType<typeof sql>> = {
  playerId: sql`excluded."playerId"`,
  songHash: sql`excluded."songHash"`,
  leaderboardId: sql`excluded."leaderboardId"`,
  songDifficulty: sql`excluded."songDifficulty"`,
  songCharacteristic: sql`excluded."songCharacteristic"`,
  songScore: sql`excluded."songScore"`,
  pauses: sql`excluded."pauses"`,
  fcAccuracy: sql`excluded."fcAccuracy"`,
  fullCombo: sql`excluded."fullCombo"`,
  savedReplay: sql`excluded."savedReplay"`,
  leftHandAccuracy: sql`excluded."leftHandAccuracy"`,
  rightHandAccuracy: sql`excluded."rightHandAccuracy"`,
  misses: sql`excluded."misses"`,
  missedNotes: sql`excluded."missedNotes"`,
  bombCuts: sql`excluded."bombCuts"`,
  wallsHit: sql`excluded."wallsHit"`,
  badCuts: sql`excluded."badCuts"`,
  improvementScore: sql`excluded."improvementScore"`,
  improvementPauses: sql`excluded."improvementPauses"`,
  improvementMisses: sql`excluded."improvementMisses"`,
  improvementMissedNotes: sql`excluded."improvementMissedNotes"`,
  improvementBombCuts: sql`excluded."improvementBombCuts"`,
  improvementWallsHit: sql`excluded."improvementWallsHit"`,
  improvementBadCuts: sql`excluded."improvementBadCuts"`,
  improvementLeftHandAccuracy: sql`excluded."improvementLeftHandAccuracy"`,
  improvementRightHandAccuracy: sql`excluded."improvementRightHandAccuracy"`,
  timestamp: sql`excluded."timestamp"`,
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

async function flushBatch(rows: (typeof beatLeaderScoresTable.$inferInsert)[]): Promise<void> {
  if (rows.length === 0) {
    return;
  }
  await db.insert(beatLeaderScoresTable).values(rows).onConflictDoUpdate({
    target: beatLeaderScoresTable.id,
    set: beatLeaderUpsertSet,
  });
}

async function main() {
  const limit = parseLimit(process.argv);
  const batchSize = parseBatchSize(process.argv);

  await mongoose.connect(env.MONGO_CONNECTION_STRING);

  let processed = 0;
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  const batch: (typeof beatLeaderScoresTable.$inferInsert)[] = [];

  const cursor = BeatLeaderScoreModel.find().lean().cursor();

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
      Logger.error(`[mongo-to-postgres] batch insert failed (${chunk.length} rows): ${e}`);
    }
  }

  for await (const doc of cursor) {
    if (limit !== undefined && processed >= limit) {
      break;
    }
    processed++;

    if (doc.scoreId == null || !Number.isFinite(doc.scoreId)) {
      skipped++;
      continue;
    }

    try {
      batch.push(mongoBeatLeaderDocToRow(doc as MongoBeatLeaderLeanDoc));
      if (batch.length >= batchSize) {
        await flush();
      }
    } catch (e) {
      errors++;
      Logger.error(`[mongo-to-postgres] map failed scoreId=${doc.scoreId}: ${e}`);
    }

    if (processed % 5000 === 0) {
      Logger.info(
        `[mongo-to-postgres] progress processed=${processed} inserted=${inserted} skipped=${skipped} errors=${errors} (batchSize=${batchSize})`
      );
    }
  }

  await flush();
  await mongoose.disconnect();

  Logger.info(
    `[mongo-to-postgres] done processed=${processed} inserted=${inserted} skipped=${skipped} errors=${errors}`
  );
}

main().catch(e => {
  Logger.error(e);
  process.exit(1);
});
