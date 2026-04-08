import { sql } from "drizzle-orm";
import { db } from "../db";

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
    const result = await db.execute<TableCountsRow>(sql`
      SELECT
        "id",
        "scoresaberScores"::bigint::int AS "scoresaberScores",
        "scoresaberScoreHistory"::bigint::int AS "scoresaberScoreHistory",
        "scoresaberAccounts"::bigint::int AS "scoresaberAccounts",
        "scoresaberLeaderboards"::bigint::int AS "scoresaberLeaderboards",
        "refreshedAt"
      FROM "ssr_table_counts"
      WHERE "id" = 1
    `);
    const counts = result[0] as TableCountsRow | undefined;
    if (!counts) {
      throw new Error('Materialized counts row missing from "ssr_table_counts"');
    }
    return counts;
  }

  public static async refreshConcurrently(): Promise<void> {
    await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY "ssr_table_counts"`);
  }
}

