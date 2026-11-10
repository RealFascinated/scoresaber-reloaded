import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import { scoreSaberLeaderboardStarChangeTable, type ScoreSaberLeaderboardStarChangeRow } from "../db/schema";

export class ScoreSaberLeaderboardStarChangeRepository {
  public static async insertRow(
    data: typeof scoreSaberLeaderboardStarChangeTable.$inferInsert
  ): Promise<void> {
    await db.insert(scoreSaberLeaderboardStarChangeTable).values(data);
  }

  public static async listByLeaderboardIdOrderedByTimestampDesc(
    leaderboardId: number,
    realmId: number = DEFAULT_REALM_ID
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
}
