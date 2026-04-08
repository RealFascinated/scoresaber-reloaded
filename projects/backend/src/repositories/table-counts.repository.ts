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

type RawTableCountsRow = {
  id: string;
  scoresaberScores: string;
  scoresaberScoreHistory: string;
  scoresaberAccounts: string;
  scoresaberLeaderboards: string;
  refreshedAt: Date;
};

export class TableCountsRepository {
  public static async getCounts(): Promise<TableCountsRow> {
    const result = await db.execute<RawTableCountsRow>(sql`
      SELECT
        "id"::text AS "id",
        "scoresaberScores"::text AS "scoresaberScores",
        "scoresaberScoreHistory"::text AS "scoresaberScoreHistory",
        "scoresaberAccounts"::text AS "scoresaberAccounts",
        "scoresaberLeaderboards"::text AS "scoresaberLeaderboards",
        "refreshedAt"
      FROM "ssr_table_counts"
      WHERE "id" = 1
    `);
    const rawCounts = result[0] as RawTableCountsRow | undefined;
    if (!rawCounts) {
      throw new Error('Materialized counts row missing from "ssr_table_counts"');
    }
    return {
      id: Number.parseInt(rawCounts.id, 10),
      scoresaberScores: Number.parseInt(rawCounts.scoresaberScores, 10),
      scoresaberScoreHistory: Number.parseInt(rawCounts.scoresaberScoreHistory, 10),
      scoresaberAccounts: Number.parseInt(rawCounts.scoresaberAccounts, 10),
      scoresaberLeaderboards: Number.parseInt(rawCounts.scoresaberLeaderboards, 10),
      refreshedAt: rawCounts.refreshedAt,
    };
  }

  public static async refreshConcurrently(): Promise<void> {
    await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY "ssr_table_counts"`);
  }
}

