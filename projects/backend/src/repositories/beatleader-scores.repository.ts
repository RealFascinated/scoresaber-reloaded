import type { MapCharacteristic } from "@ssr/common/schemas/map/map-characteristic";
import type { MapDifficulty } from "@ssr/common/schemas/map/map-difficulty";
import { and, count, desc, eq, inArray, lt, or, sql } from "drizzle-orm";
import { db } from "../db";
import { beatLeaderScoresTable } from "../db/schema";

/** One {@link BeatLeaderScoresRepository.findLatestBySong} lookup. */
export type BeatLeaderSongScoreLookup = {
  playerId: string;
  songHashUpper: string;
  songDifficulty: MapDifficulty;
  songCharacteristic: MapCharacteristic;
  songScore: number;
};

function songScoreLookupKey(
  playerId: string,
  songHash: string,
  songDifficulty: string,
  songCharacteristic: string,
  songScore: number
) {
  return `${playerId}:${songHash}:${songDifficulty}:${songCharacteristic}:${songScore}`;
}

export type BeatLeaderScoreInsert = typeof beatLeaderScoresTable.$inferInsert;

export class BeatLeaderScoresRepository {
  public static async findRowById(scoreId: number) {
    const [row] = await db.select().from(beatLeaderScoresTable).where(eq(beatLeaderScoresTable.id, scoreId));
    return row;
  }

  /**
   * Inserts a score, ignoring conflicts with a concurrently inserted copy.
   *
   * @returns the inserted row, or undefined if the score already existed
   */
  public static async insertReturning(row: BeatLeaderScoreInsert) {
    const [inserted] = await db.insert(beatLeaderScoresTable).values(row).onConflictDoNothing().returning();
    return inserted;
  }

  /**
   * Inserts many scores at once, skipping ids that already exist.
   *
   * @param rows the scores to store
   * @returns the ids of the scores that were inserted
   */
  public static async insertManyReturningIds(rows: BeatLeaderScoreInsert[]) {
    const ids: number[] = [];
    for (let i = 0; i < rows.length; i += 500) {
      const inserted = await db
        .insert(beatLeaderScoresTable)
        .values(rows.slice(i, i + 500))
        .onConflictDoNothing()
        .returning({ id: beatLeaderScoresTable.id });
      ids.push(...inserted.map(row => row.id));
    }
    return ids;
  }

  public static async findLatestBySong(
    playerId: string,
    songHashUpper: string,
    songDifficulty: MapDifficulty,
    songCharacteristic: MapCharacteristic,
    songScore: number
  ) {
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

  /**
   * Batch variant of {@link findLatestBySong}: one query for many lookups.
   *
   * @returns the latest row of each lookup, in the same order, `undefined` when none exists
   */
  public static async findLatestBySongs(lookups: BeatLeaderSongScoreLookup[]) {
    if (lookups.length === 0) {
      return [];
    }
    const rows = await db
      .select()
      .from(beatLeaderScoresTable)
      .where(
        or(
          ...lookups.map(lookup =>
            and(
              eq(beatLeaderScoresTable.playerId, lookup.playerId),
              eq(beatLeaderScoresTable.songHash, lookup.songHashUpper),
              eq(beatLeaderScoresTable.songDifficulty, lookup.songDifficulty),
              eq(beatLeaderScoresTable.songCharacteristic, lookup.songCharacteristic),
              eq(beatLeaderScoresTable.songScore, lookup.songScore)
            )
          )
        )
      )
      .orderBy(desc(beatLeaderScoresTable.timestamp));
    const latest = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      const key = songScoreLookupKey(
        row.playerId,
        row.songHash,
        row.songDifficulty,
        row.songCharacteristic,
        row.songScore
      );
      if (!latest.has(key)) {
        latest.set(key, row);
      }
    }
    return lookups.map(lookup =>
      latest.get(
        songScoreLookupKey(
          lookup.playerId,
          lookup.songHashUpper,
          lookup.songDifficulty,
          lookup.songCharacteristic,
          lookup.songScore
        )
      )
    );
  }

  /**
   * Gets the best score of a player on a map, preferring scores with a saved replay on ties.
   */
  public static async findBestBySong(
    playerId: string,
    songHashUpper: string,
    songDifficulty: MapDifficulty,
    songCharacteristic: MapCharacteristic
  ) {
    const rows = await db
      .select()
      .from(beatLeaderScoresTable)
      .where(
        and(
          eq(beatLeaderScoresTable.playerId, playerId),
          eq(beatLeaderScoresTable.songHash, songHashUpper),
          eq(beatLeaderScoresTable.songDifficulty, songDifficulty),
          eq(beatLeaderScoresTable.songCharacteristic, songCharacteristic)
        )
      )
      .orderBy(
        desc(beatLeaderScoresTable.songScore),
        desc(beatLeaderScoresTable.savedReplay),
        desc(beatLeaderScoresTable.timestamp)
      )
      .limit(1);
    return rows[0];
  }

  public static async rowExistsById(scoreId: number) {
    const rows = await db
      .select({ exists: sql`1` })
      .from(beatLeaderScoresTable)
      .where(eq(beatLeaderScoresTable.id, scoreId));
    return rows.length > 0;
  }

  public static async findExistingIds(scoreIds: number[]) {
    if (scoreIds.length === 0) {
      return new Set();
    }
    const unique = Array.from(new Set(scoreIds));
    const rows = await db
      .select({ id: beatLeaderScoresTable.id })
      .from(beatLeaderScoresTable)
      .where(inArray(beatLeaderScoresTable.id, unique));
    return new Set(rows.map(r => r.id));
  }

  public static async findPreviousIdBeforeTimestamp(
    playerId: string,
    songHashUpper: string,
    leaderboardId: string,
    timestamp: Date
  ) {
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

  public static async countSavedReplays() {
    const [row] = await db
      .select({ c: count() })
      .from(beatLeaderScoresTable)
      .where(eq(beatLeaderScoresTable.savedReplay, true));
    return row?.c ?? 0;
  }
}
