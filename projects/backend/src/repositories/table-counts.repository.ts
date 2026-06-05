import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { tableCountsTable } from "../db/schema";

export type TableCountsRow = {
  id: number;
  scoresaberScores: number;
  scoresaberScoreHistory: number;
  scoresaberAccounts: number;
  scoresaberLeaderboards: number;
  refreshedAt: Date;
};

export class TableCountsRepository {
  public static async getCounts(): Promise<TableCountsRow> {
    const [counts] = await db.select().from(tableCountsTable).where(eq(tableCountsTable.id, 1));
    if (!counts) {
      throw new Error('Table counts row missing from "ssr_table_counts"');
    }
    return counts;
  }

  public static async reconcile(): Promise<void> {
    await db.execute(sql`SELECT reconcile_ssr_table_counts()`);
  }
}
