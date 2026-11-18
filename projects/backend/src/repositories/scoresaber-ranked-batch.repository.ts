import { and, asc, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import {
  scoreSaberLeaderboardsTable,
  scoreSaberLeaderboardStarChangeTable,
  scoreSaberRankedBatchesTable,
  scoreSaberRankedBatchNewLeaderboardsTable,
  scoreSaberRankedBatchPlayersTable,
  scoreSaberRankedBatchScoresTable,
} from "../db/schema";

export type ScoreSaberRankedBatchInsert = typeof scoreSaberRankedBatchesTable.$inferInsert;

/** A star change joined with the identity of its leaderboard. */
export type RankedBatchStarChangeRow = {
  leaderboardId: number;
  songHash: string;
  songName: string;
  songSubName: string;
  songAuthorName: string;
  levelAuthorName: string;
  difficulty: (typeof scoreSaberLeaderboardsTable.$inferSelect)["difficulty"];
  characteristic: (typeof scoreSaberLeaderboardsTable.$inferSelect)["characteristic"];
  previousStars: number;
  newStars: number;
  timestamp: Date;
};

/** A newly ranked leaderboard joined with its identity. */
export type RankedBatchNewLeaderboardRow = Omit<RankedBatchStarChangeRow, "previousStars" | "newStars"> & {
  stars: number;
};

export type ScoreSaberRankedBatchNewLeaderboardInsert =
  typeof scoreSaberRankedBatchNewLeaderboardsTable.$inferInsert;

export class ScoreSaberRankedBatchRepository {
  public static async insert(data: ScoreSaberRankedBatchInsert) {
    const [row] = await db.insert(scoreSaberRankedBatchesTable).values(data).returning();
    return row;
  }

  public static async getById(id: number) {
    const [row] = await db
      .select()
      .from(scoreSaberRankedBatchesTable)
      .where(eq(scoreSaberRankedBatchesTable.id, id))
      .limit(1);
    return row;
  }

  /**
   * Finds the most recent ranked batch of a realm that was still collecting changes at `cutoff`, i.e.
   * the one a star change made after `cutoff` should be merged into.
   *
   * @param realmId the realm to look in
   * @param cutoff the earliest `endedAt` that still counts
   */
  public static async findLatestEndedSince(realmId: number, cutoff: Date) {
    const [row] = await db
      .select()
      .from(scoreSaberRankedBatchesTable)
      .where(
        and(
          eq(scoreSaberRankedBatchesTable.realmId, realmId),
          gte(scoreSaberRankedBatchesTable.endedAt, cutoff)
        )
      )
      .orderBy(desc(scoreSaberRankedBatchesTable.endedAt))
      .limit(1);
    return row;
  }

  /**
   * Moves the end of a ranked batch forward. Never moves it back.
   */
  public static async extendEnd(id: number, endedAt: Date) {
    await db
      .update(scoreSaberRankedBatchesTable)
      .set({
        endedAt: sql`greatest(${scoreSaberRankedBatchesTable.endedAt}, ${endedAt.toISOString()}::timestamp)`,
      })
      .where(eq(scoreSaberRankedBatchesTable.id, id));
  }

  public static async markNotified(id: number, notifiedAt: Date) {
    await db
      .update(scoreSaberRankedBatchesTable)
      .set({ notifiedAt })
      .where(eq(scoreSaberRankedBatchesTable.id, id));
  }

  /**
   * Recounts the leaderboards of a ranked batch from its star changes.
   */
  public static async refreshLeaderboardCount(id: number) {
    await db
      .update(scoreSaberRankedBatchesTable)
      .set({
        leaderboardCount: sql`(
          select count(distinct ${scoreSaberLeaderboardStarChangeTable.leaderboardId})
          from ${scoreSaberLeaderboardStarChangeTable}
          where ${scoreSaberLeaderboardStarChangeTable.rankedBatchId} = ${id}
        )`,
      })
      .where(eq(scoreSaberRankedBatchesTable.id, id));
  }

  /**
   * Records leaderboards that became ranked in a ranked batch. A leaderboard already recorded in the
   * ranked batch is left alone, so a sync that is retried does not duplicate it.
   */
  public static async insertNewLeaderboards(rows: ScoreSaberRankedBatchNewLeaderboardInsert[]) {
    if (rows.length === 0) {
      return;
    }
    await db.insert(scoreSaberRankedBatchNewLeaderboardsTable).values(rows).onConflictDoNothing();
  }

  /**
   * Recounts the newly ranked leaderboards of a ranked batch.
   */
  public static async refreshNewLeaderboardCount(id: number) {
    await db
      .update(scoreSaberRankedBatchesTable)
      .set({
        newLeaderboardCount: sql`(
          select count(*) from ${scoreSaberRankedBatchNewLeaderboardsTable}
          where ${scoreSaberRankedBatchNewLeaderboardsTable.rankedBatchId} = ${id}
        )`,
      })
      .where(eq(scoreSaberRankedBatchesTable.id, id));
  }

  /**
   * Lists the leaderboards that became ranked in a ranked batch with their identity, highest stars first.
   */
  public static async listNewLeaderboards(rankedBatchId: number) {
    return db
      .select({
        leaderboardId: scoreSaberLeaderboardsTable.id,
        songHash: scoreSaberLeaderboardsTable.songHash,
        songName: scoreSaberLeaderboardsTable.songName,
        songSubName: scoreSaberLeaderboardsTable.songSubName,
        songAuthorName: scoreSaberLeaderboardsTable.songAuthorName,
        levelAuthorName: scoreSaberLeaderboardsTable.levelAuthorName,
        difficulty: scoreSaberLeaderboardsTable.difficulty,
        characteristic: scoreSaberLeaderboardsTable.characteristic,
        stars: scoreSaberRankedBatchNewLeaderboardsTable.stars,
        timestamp: scoreSaberRankedBatchNewLeaderboardsTable.timestamp,
      })
      .from(scoreSaberRankedBatchNewLeaderboardsTable)
      .innerJoin(
        scoreSaberLeaderboardsTable,
        eq(scoreSaberRankedBatchNewLeaderboardsTable.leaderboardId, scoreSaberLeaderboardsTable.id)
      )
      .where(eq(scoreSaberRankedBatchNewLeaderboardsTable.rankedBatchId, rankedBatchId))
      .orderBy(
        desc(scoreSaberRankedBatchNewLeaderboardsTable.stars),
        asc(scoreSaberRankedBatchNewLeaderboardsTable.leaderboardId)
      );
  }

  /**
   * Recounts the players and scores of a ranked batch from its captured pp changes.
   */
  public static async refreshPpCounts(id: number) {
    await db
      .update(scoreSaberRankedBatchesTable)
      .set({
        playerCount: sql`(
          select count(*) from ${scoreSaberRankedBatchPlayersTable}
          where ${scoreSaberRankedBatchPlayersTable.rankedBatchId} = ${id}
        )`,
        scoreCount: sql`(
          select count(*) from ${scoreSaberRankedBatchScoresTable}
          where ${scoreSaberRankedBatchScoresTable.rankedBatchId} = ${id}
        )`,
      })
      .where(eq(scoreSaberRankedBatchesTable.id, id));
  }

  public static async count(realmId: number) {
    const [row] = await db
      .select({ value: count() })
      .from(scoreSaberRankedBatchesTable)
      .where(eq(scoreSaberRankedBatchesTable.realmId, realmId));
    return row?.value ?? 0;
  }

  /**
   * Lists a page of a realm's ranked batches, newest first.
   */
  public static async listPage(realmId: number, limit: number, offset: number) {
    return db
      .select()
      .from(scoreSaberRankedBatchesTable)
      .where(eq(scoreSaberRankedBatchesTable.realmId, realmId))
      .orderBy(desc(scoreSaberRankedBatchesTable.startedAt), desc(scoreSaberRankedBatchesTable.id))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Lists every ranked batch of a realm, oldest first.
   */
  public static async listAll(realmId: number) {
    return db
      .select()
      .from(scoreSaberRankedBatchesTable)
      .where(eq(scoreSaberRankedBatchesTable.realmId, realmId))
      .orderBy(asc(scoreSaberRankedBatchesTable.startedAt), asc(scoreSaberRankedBatchesTable.id));
  }

  /**
   * Lists the star changes of a ranked batch with their leaderboards, oldest first.
   */
  public static async listStarChanges(rankedBatchId: number) {
    return db
      .select({
        leaderboardId: scoreSaberLeaderboardsTable.id,
        songHash: scoreSaberLeaderboardsTable.songHash,
        songName: scoreSaberLeaderboardsTable.songName,
        songSubName: scoreSaberLeaderboardsTable.songSubName,
        songAuthorName: scoreSaberLeaderboardsTable.songAuthorName,
        levelAuthorName: scoreSaberLeaderboardsTable.levelAuthorName,
        difficulty: scoreSaberLeaderboardsTable.difficulty,
        characteristic: scoreSaberLeaderboardsTable.characteristic,
        previousStars: scoreSaberLeaderboardStarChangeTable.previousStars,
        newStars: scoreSaberLeaderboardStarChangeTable.newStars,
        timestamp: scoreSaberLeaderboardStarChangeTable.timestamp,
      })
      .from(scoreSaberLeaderboardStarChangeTable)
      .innerJoin(
        scoreSaberLeaderboardsTable,
        eq(scoreSaberLeaderboardStarChangeTable.leaderboardId, scoreSaberLeaderboardsTable.id)
      )
      .where(eq(scoreSaberLeaderboardStarChangeTable.rankedBatchId, rankedBatchId))
      .orderBy(
        asc(scoreSaberLeaderboardStarChangeTable.timestamp),
        asc(scoreSaberLeaderboardStarChangeTable.id)
      );
  }

  /**
   * Finds which of the given ranked batches still have star changes whose pp changes are not captured yet.
   */
  public static async selectPpPendingIds(rankedBatchIds: number[]) {
    if (rankedBatchIds.length === 0) {
      return new Set();
    }
    const rows = await db
      .selectDistinct({ rankedBatchId: scoreSaberLeaderboardStarChangeTable.rankedBatchId })
      .from(scoreSaberLeaderboardStarChangeTable)
      .where(
        and(
          inArray(scoreSaberLeaderboardStarChangeTable.rankedBatchId, rankedBatchIds),
          eq(scoreSaberLeaderboardStarChangeTable.ppPending, true)
        )
      );
    return new Set(rows.flatMap(row => (row.rankedBatchId === null ? [] : [row.rankedBatchId])));
  }

  /**
   * Lists the distinct leaderboard ids of a ranked batch's star changes.
   */
  public static async selectLeaderboardIds(rankedBatchId: number) {
    const rows = await db
      .selectDistinct({ leaderboardId: scoreSaberLeaderboardStarChangeTable.leaderboardId })
      .from(scoreSaberLeaderboardStarChangeTable)
      .where(eq(scoreSaberLeaderboardStarChangeTable.rankedBatchId, rankedBatchId));
    return rows.map(row => row.leaderboardId);
  }
}
