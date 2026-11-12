import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { scoreSaberLeaderboardStarChangeTable, type ScoreSaberLeaderboardStarChangeRow } from "../db/schema";

export type ScoreSaberLeaderboardStarChangeInsert = typeof scoreSaberLeaderboardStarChangeTable.$inferInsert;

export class ScoreSaberLeaderboardStarChangeRepository {
  public static async insertRow(data: ScoreSaberLeaderboardStarChangeInsert): Promise<void> {
    await db.insert(scoreSaberLeaderboardStarChangeTable).values(data);
  }

  public static async insertRows(data: ScoreSaberLeaderboardStarChangeInsert[]): Promise<void> {
    if (data.length === 0) {
      return;
    }
    await db.insert(scoreSaberLeaderboardStarChangeTable).values(data);
  }

  public static async listByLeaderboardIdOrderedByTimestampDesc(
    leaderboardId: number,
    realmId: number
  ): Promise<ScoreSaberLeaderboardStarChangeRow[]> {
    return db
      .select()
      .from(scoreSaberLeaderboardStarChangeTable)
      .where(
        and(
          eq(scoreSaberLeaderboardStarChangeTable.leaderboardId, leaderboardId),
          eq(scoreSaberLeaderboardStarChangeTable.realmId, realmId)
        )
      )
      .orderBy(desc(scoreSaberLeaderboardStarChangeTable.timestamp));
  }

  /**
   * Lists the star changes of a realm whose pp changes have not been captured yet.
   *
   * @param realmId the realm to list for
   */
  public static async listPpPending(realmId: number): Promise<ScoreSaberLeaderboardStarChangeRow[]> {
    return db
      .select()
      .from(scoreSaberLeaderboardStarChangeTable)
      .where(
        and(
          eq(scoreSaberLeaderboardStarChangeTable.realmId, realmId),
          eq(scoreSaberLeaderboardStarChangeTable.ppPending, true)
        )
      )
      .orderBy(asc(scoreSaberLeaderboardStarChangeTable.timestamp));
  }

  /**
   * Marks star changes as having had their pp changes captured.
   *
   * @param ids the star change row ids
   */
  public static async markPpCaptured(ids: number[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    await db
      .update(scoreSaberLeaderboardStarChangeTable)
      .set({ ppPending: false })
      .where(inArray(scoreSaberLeaderboardStarChangeTable.id, ids));
  }
}
