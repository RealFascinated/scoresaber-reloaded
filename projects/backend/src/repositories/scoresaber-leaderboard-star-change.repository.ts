import { desc, eq } from "drizzle-orm";
import { db } from "../db";
import { scoreSaberLeaderboardStarChangeTable, type ScoreSaberLeaderboardStarChangeRow } from "../db/schema";

export class ScoreSaberLeaderboardStarChangeRepository {
  public static async insertRow(
    data: typeof scoreSaberLeaderboardStarChangeTable.$inferInsert
  ): Promise<void> {
    await db.insert(scoreSaberLeaderboardStarChangeTable).values(data);
  }

  public static async listByLeaderboardIdOrderedByTimestampDesc(
    leaderboardId: number
  ): Promise<ScoreSaberLeaderboardStarChangeRow[]> {
    return db
      .select()
      .from(scoreSaberLeaderboardStarChangeTable)
      .where(eq(scoreSaberLeaderboardStarChangeTable.leaderboardId, leaderboardId))
      .orderBy(desc(scoreSaberLeaderboardStarChangeTable.timestamp));
  }
}
