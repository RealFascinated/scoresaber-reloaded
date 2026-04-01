import type { MapCharacteristic } from "@ssr/common/schemas/map/map-characteristic";
import type { MapDifficulty } from "@ssr/common/schemas/map/map-difficulty";
import { and, count, desc, eq, inArray, lt } from "drizzle-orm";
import { db } from "../db";
import { beatLeaderScoresTable, type BeatLeaderScoreRow } from "../db/schema";

export type BeatLeaderScoreInsert = typeof beatLeaderScoresTable.$inferInsert;

export class BeatLeaderScoresRepository {
  public static async findRowById(scoreId: number): Promise<BeatLeaderScoreRow | undefined> {
    const [row] = await db
      .select()
      .from(beatLeaderScoresTable)
      .where(eq(beatLeaderScoresTable.id, scoreId))
      .limit(1);
    return row;
  }

  public static async insertReturning(row: BeatLeaderScoreInsert): Promise<BeatLeaderScoreRow> {
    const [inserted] = await db.insert(beatLeaderScoresTable).values(row).returning();
    if (!inserted) {
      throw new Error("BeatLeader score insert returned no row");
    }
    return inserted;
  }

  public static async findLatestBySongComposite(
    playerId: string,
    songHashUpper: string,
    songDifficulty: MapDifficulty,
    songCharacteristic: MapCharacteristic,
    songScore: number
  ): Promise<BeatLeaderScoreRow | undefined> {
    const rows = await db
      .select()
      .from(beatLeaderScoresTable)
      .where(
        and(
          eq(beatLeaderScoresTable.playerId, playerId),
          eq(beatLeaderScoresTable.songHash, songHashUpper),
          eq(beatLeaderScoresTable.songDifficulty, songDifficulty),
          eq(beatLeaderScoresTable.songCharacteristic, songCharacteristic),
          eq(beatLeaderScoresTable.songScore, songScore)
        )
      )
      .orderBy(desc(beatLeaderScoresTable.timestamp))
      .limit(1);
    return rows[0];
  }

  public static async rowExistsById(scoreId: number): Promise<boolean> {
    const rows = await db
      .select({ id: beatLeaderScoresTable.id })
      .from(beatLeaderScoresTable)
      .where(eq(beatLeaderScoresTable.id, scoreId))
      .limit(1);
    return rows.length > 0;
  }

  public static async findExistingIds(scoreIds: number[]): Promise<Set<number>> {
    if (scoreIds.length === 0) return new Set();
    const unique = Array.from(new Set(scoreIds));
    const rows = await db
      .select({ id: beatLeaderScoresTable.id })
      .from(beatLeaderScoresTable)
      .where(inArray(beatLeaderScoresTable.id, unique));
    return new Set(rows.map(r => r.id));
  }

  public static async findPreviousScoreIdBeforeTimestamp(
    playerId: string,
    songHashUpper: string,
    leaderboardId: string,
    timestamp: Date
  ): Promise<number | undefined> {
    const rows = await db
      .select({ id: beatLeaderScoresTable.id })
      .from(beatLeaderScoresTable)
      .where(
        and(
          eq(beatLeaderScoresTable.playerId, playerId),
          eq(beatLeaderScoresTable.songHash, songHashUpper),
          eq(beatLeaderScoresTable.leaderboardId, leaderboardId),
          lt(beatLeaderScoresTable.timestamp, timestamp)
        )
      )
      .orderBy(desc(beatLeaderScoresTable.timestamp))
      .limit(1);
    return rows[0]?.id;
  }

  public static async countSavedReplays(): Promise<number> {
    const [row] = await db
      .select({ c: count() })
      .from(beatLeaderScoresTable)
      .where(eq(beatLeaderScoresTable.savedReplay, true));
    return row?.c ?? 0;
  }
}
