import { eq } from "drizzle-orm";
import { db } from "../db";
import { scoreSaberLeaderboardSuggestedMapsTable } from "../db/schema";

export type ScoreSaberLeaderboardSuggestedMapsInsert =
  typeof scoreSaberLeaderboardSuggestedMapsTable.$inferInsert;

const INSERT_CHUNK_SIZE = 2_000;

export class ScoreSaberLeaderboardSuggestedMapsRepository {
  /**
   * Replaces every row of a realm in one transaction, so readers never see a half written fit.
   */
  public static async replaceRealm(realmId: number, rows: ScoreSaberLeaderboardSuggestedMapsInsert[]) {
    await db.transaction(async tx => {
      await tx
        .delete(scoreSaberLeaderboardSuggestedMapsTable)
        .where(eq(scoreSaberLeaderboardSuggestedMapsTable.realmId, realmId));
      for (let i = 0; i < rows.length; i += INSERT_CHUNK_SIZE) {
        await tx.insert(scoreSaberLeaderboardSuggestedMapsTable).values(rows.slice(i, i + INSERT_CHUNK_SIZE));
      }
    });
  }
}
