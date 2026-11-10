import { eq } from "drizzle-orm";
import { db } from "../db";
import { beatLeaderPbotTable } from "../db/schema";

export class BeatLeaderPbotRepository {
  /**
   * Gets the stored accuracy by second of a BeatLeader score (accuracy x 100, null before the first note).
   *
   * @param scoreId the BeatLeader score id
   */
  public static async findAccuracyBySecond(scoreId: number): Promise<(number | null)[] | undefined> {
    const [row] = await db
      .select({ accuracyBySecond: beatLeaderPbotTable.accuracyBySecond })
      .from(beatLeaderPbotTable)
      .where(eq(beatLeaderPbotTable.scoreId, scoreId))
      .limit(1);
    return row?.accuracyBySecond;
  }

  /**
   * Stores the accuracy by second of a BeatLeader score. A score's replay never changes, so an
   * existing row is kept.
   *
   * @param scoreId the BeatLeader score id
   * @param accuracyBySecond accuracy x 100, null before the first note
   */
  public static async insert(scoreId: number, accuracyBySecond: (number | null)[]): Promise<void> {
    await db.insert(beatLeaderPbotTable).values({ scoreId, accuracyBySecond }).onConflictDoNothing();
  }
}
