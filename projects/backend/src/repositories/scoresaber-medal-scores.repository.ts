import type { AnyColumn, SQL } from "drizzle-orm";
import { and, desc, eq, inArray, sql, sum } from "drizzle-orm";
import { db } from "../db";
import { scoreSaberMedalScoresTable, type ScoreSaberMedalScoreRow } from "../db/schema";

export type ScoreSaberMedalScoreInsert = typeof scoreSaberMedalScoresTable.$inferInsert;

export class ScoreSaberMedalScoresRepository {
  public static async sumMedalsGroupedByPlayerId(): Promise<{ playerId: string; totalMedals: number }[]> {
    const rows = await db
      .select({
        playerId: scoreSaberMedalScoresTable.playerId,
        totalMedals: sum(scoreSaberMedalScoresTable.medals),
      })
      .from(scoreSaberMedalScoresTable)
      .groupBy(scoreSaberMedalScoresTable.playerId);
    return rows.map(row => ({
      playerId: row.playerId,
      totalMedals: Number(row.totalMedals ?? 0),
    }));
  }

  public static async sumMedalsGroupedByPlayerIdIn(
    playerIds: string[]
  ): Promise<{ playerId: string; totalMedals: number }[]> {
    if (playerIds.length === 0) return [];
    const rows = await db
      .select({
        playerId: scoreSaberMedalScoresTable.playerId,
        totalMedals: sum(scoreSaberMedalScoresTable.medals),
      })
      .from(scoreSaberMedalScoresTable)
      .where(inArray(scoreSaberMedalScoresTable.playerId, playerIds))
      .groupBy(scoreSaberMedalScoresTable.playerId);
    return rows.map(row => ({
      playerId: row.playerId,
      totalMedals: Number(row.totalMedals ?? 0),
    }));
  }

  public static async countByConditions(conditions: SQL[]): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(scoreSaberMedalScoresTable)
      .where(and(...conditions));
    return Number(row?.count ?? 0);
  }

  /**
   * 1-based rank per leaderboard (medals desc, timestamp desc, scoreId desc).
   * Window runs over all rows in the given leaderboards; only target score IDs are returned.
   */
  public static async getMedalTableScoreRanksForScores(
    targets: { scoreId: number; leaderboardId: number }[]
  ): Promise<Map<number, number>> {
    if (targets.length === 0) {
      return new Map();
    }
    const leaderboardIds = [...new Set(targets.map(t => t.leaderboardId))];
    const scoreIds = targets.map(t => t.scoreId);

    const result = await db.execute(sql`
      WITH ranked AS (
        SELECT
          "scoreId",
          cast(
            row_number() over (
              partition by "leaderboardId"
              order by
                medals desc,
                timestamp desc,
                "scoreId" desc
            ) as integer
          ) AS rank
        FROM "scoresaber-medal-scores"
        WHERE "leaderboardId" IN (${sql.join(
          leaderboardIds.map(id => sql`${id}`),
          sql`, `
        )})
      )
      SELECT "scoreId", rank FROM ranked
      WHERE "scoreId" IN (${sql.join(
        scoreIds.map(id => sql`${id}`),
        sql`, `
      )})
    `);

    const rows = (result as unknown as { rows: { scoreId: number; rank: number }[] }).rows ?? [];
    return new Map(rows.map(r => [Number(r.scoreId), Number(r.rank)]));
  }

  public static async findRowsByConditions(
    conditions: SQL[],
    orderBy: SQL | AnyColumn,
    limit: number,
    offset: number
  ): Promise<ScoreSaberMedalScoreRow[]> {
    return db
      .select()
      .from(scoreSaberMedalScoresTable)
      .where(and(...conditions))
      .orderBy(orderBy as SQL)
      .limit(limit)
      .offset(offset);
  }

  public static async findRowsByLeaderboardId(leaderboardId: number): Promise<ScoreSaberMedalScoreRow[]> {
    return db
      .select()
      .from(scoreSaberMedalScoresTable)
      .where(eq(scoreSaberMedalScoresTable.leaderboardId, leaderboardId));
  }

  public static async findRowsByLeaderboardIdOrderByScoreDesc(
    leaderboardId: number
  ): Promise<ScoreSaberMedalScoreRow[]> {
    return db
      .select()
      .from(scoreSaberMedalScoresTable)
      .where(eq(scoreSaberMedalScoresTable.leaderboardId, leaderboardId))
      .orderBy(desc(scoreSaberMedalScoresTable.score), desc(scoreSaberMedalScoresTable.scoreId));
  }

  public static async deleteByLeaderboardId(leaderboardId: number): Promise<void> {
    await db
      .delete(scoreSaberMedalScoresTable)
      .where(eq(scoreSaberMedalScoresTable.leaderboardId, leaderboardId));
  }

  public static async insertMany(rows: ScoreSaberMedalScoreInsert[]): Promise<void> {
    if (rows.length === 0) return;
    await db.insert(scoreSaberMedalScoresTable).values(rows);
  }

  public static async replaceLeaderboardRows(
    leaderboardId: number,
    rows: ScoreSaberMedalScoreInsert[]
  ): Promise<void> {
    await db.transaction(async tx => {
      await tx
        .delete(scoreSaberMedalScoresTable)
        .where(eq(scoreSaberMedalScoresTable.leaderboardId, leaderboardId));
      if (rows.length > 0) {
        await tx.insert(scoreSaberMedalScoresTable).values(rows);
      }
    });
  }
}
