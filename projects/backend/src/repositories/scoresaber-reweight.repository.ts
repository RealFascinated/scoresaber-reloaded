import { and, asc, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import {
  scoreSaberLeaderboardsTable,
  scoreSaberLeaderboardStarChangeTable,
  scoreSaberReweightPlayersTable,
  scoreSaberReweightScoresTable,
  scoreSaberReweightsTable,
  type ScoreSaberReweightRow,
} from "../db/schema";

export type ScoreSaberReweightInsert = typeof scoreSaberReweightsTable.$inferInsert;

/** A star change joined with the identity of its leaderboard. */
export type ReweightStarChangeRow = {
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

export class ScoreSaberReweightRepository {
  public static async insert(data: ScoreSaberReweightInsert): Promise<ScoreSaberReweightRow> {
    const [row] = await db.insert(scoreSaberReweightsTable).values(data).returning();
    return row;
  }

  public static async getById(id: number): Promise<ScoreSaberReweightRow | undefined> {
    const [row] = await db
      .select()
      .from(scoreSaberReweightsTable)
      .where(eq(scoreSaberReweightsTable.id, id))
      .limit(1);
    return row;
  }

  /**
   * Finds the most recent reweight of a realm that was still collecting changes at `cutoff`, i.e.
   * the one a star change made after `cutoff` should be merged into.
   *
   * @param realmId the realm to look in
   * @param cutoff the earliest `endedAt` that still counts
   */
  public static async findLatestEndedSince(
    realmId: number,
    cutoff: Date
  ): Promise<ScoreSaberReweightRow | undefined> {
    const [row] = await db
      .select()
      .from(scoreSaberReweightsTable)
      .where(
        and(eq(scoreSaberReweightsTable.realmId, realmId), gte(scoreSaberReweightsTable.endedAt, cutoff))
      )
      .orderBy(desc(scoreSaberReweightsTable.endedAt))
      .limit(1);
    return row;
  }

  /**
   * Moves the end of a reweight forward. Never moves it back.
   */
  public static async extendEnd(id: number, endedAt: Date): Promise<void> {
    await db
      .update(scoreSaberReweightsTable)
      .set({
        endedAt: sql`greatest(${scoreSaberReweightsTable.endedAt}, ${endedAt.toISOString()}::timestamp)`,
      })
      .where(eq(scoreSaberReweightsTable.id, id));
  }

  public static async markNotified(id: number, notifiedAt: Date): Promise<void> {
    await db.update(scoreSaberReweightsTable).set({ notifiedAt }).where(eq(scoreSaberReweightsTable.id, id));
  }

  /**
   * Recounts the leaderboards of a reweight from its star changes.
   */
  public static async refreshLeaderboardCount(id: number): Promise<void> {
    await db
      .update(scoreSaberReweightsTable)
      .set({
        leaderboardCount: sql`(
          select count(distinct ${scoreSaberLeaderboardStarChangeTable.leaderboardId})
          from ${scoreSaberLeaderboardStarChangeTable}
          where ${scoreSaberLeaderboardStarChangeTable.reweightId} = ${id}
        )`,
      })
      .where(eq(scoreSaberReweightsTable.id, id));
  }

  /**
   * Recounts the players and scores of a reweight from its captured pp changes.
   */
  public static async refreshPpCounts(id: number): Promise<void> {
    await db
      .update(scoreSaberReweightsTable)
      .set({
        playerCount: sql`(
          select count(*) from ${scoreSaberReweightPlayersTable}
          where ${scoreSaberReweightPlayersTable.reweightId} = ${id}
        )`,
        scoreCount: sql`(
          select count(*) from ${scoreSaberReweightScoresTable}
          where ${scoreSaberReweightScoresTable.reweightId} = ${id}
        )`,
      })
      .where(eq(scoreSaberReweightsTable.id, id));
  }

  public static async count(realmId: number): Promise<number> {
    const [row] = await db
      .select({ value: count() })
      .from(scoreSaberReweightsTable)
      .where(eq(scoreSaberReweightsTable.realmId, realmId));
    return row?.value ?? 0;
  }

  /**
   * Lists a page of a realm's reweights, newest first.
   */
  public static async listPage(
    realmId: number,
    limit: number,
    offset: number
  ): Promise<ScoreSaberReweightRow[]> {
    return db
      .select()
      .from(scoreSaberReweightsTable)
      .where(eq(scoreSaberReweightsTable.realmId, realmId))
      .orderBy(desc(scoreSaberReweightsTable.startedAt), desc(scoreSaberReweightsTable.id))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Lists every reweight of a realm, oldest first.
   */
  public static async listAll(realmId: number): Promise<ScoreSaberReweightRow[]> {
    return db
      .select()
      .from(scoreSaberReweightsTable)
      .where(eq(scoreSaberReweightsTable.realmId, realmId))
      .orderBy(asc(scoreSaberReweightsTable.startedAt), asc(scoreSaberReweightsTable.id));
  }

  /**
   * Lists the star changes of a reweight with their leaderboards, oldest first.
   */
  public static async listStarChanges(reweightId: number): Promise<ReweightStarChangeRow[]> {
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
      .where(eq(scoreSaberLeaderboardStarChangeTable.reweightId, reweightId))
      .orderBy(
        asc(scoreSaberLeaderboardStarChangeTable.timestamp),
        asc(scoreSaberLeaderboardStarChangeTable.id)
      );
  }

  /**
   * Finds which of the given reweights still have star changes whose pp changes are not captured yet.
   */
  public static async selectPpPendingIds(reweightIds: number[]): Promise<Set<number>> {
    if (reweightIds.length === 0) {
      return new Set();
    }
    const rows = await db
      .selectDistinct({ reweightId: scoreSaberLeaderboardStarChangeTable.reweightId })
      .from(scoreSaberLeaderboardStarChangeTable)
      .where(
        and(
          inArray(scoreSaberLeaderboardStarChangeTable.reweightId, reweightIds),
          eq(scoreSaberLeaderboardStarChangeTable.ppPending, true)
        )
      );
    return new Set(rows.flatMap(row => (row.reweightId === null ? [] : [row.reweightId])));
  }

  /**
   * Lists the distinct leaderboard ids of a reweight's star changes.
   */
  public static async selectLeaderboardIds(reweightId: number): Promise<number[]> {
    const rows = await db
      .selectDistinct({ leaderboardId: scoreSaberLeaderboardStarChangeTable.leaderboardId })
      .from(scoreSaberLeaderboardStarChangeTable)
      .where(eq(scoreSaberLeaderboardStarChangeTable.reweightId, reweightId));
    return rows.map(row => row.leaderboardId);
  }
}
