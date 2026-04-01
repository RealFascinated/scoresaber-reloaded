import { HMD } from "@ssr/common/hmds";
import type { AnyColumn, SQL } from "drizzle-orm";
import { and, count, desc, eq, gt, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "../db";
import { scoreSaberLeaderboardsTable, scoreSaberScoresTable, type ScoreSaberScoreRow } from "../db/schema";

export type ScoreSaberScoreUpsertRow = typeof scoreSaberScoresTable.$inferInsert;

/** `ON CONFLICT DO UPDATE` column map for bulk ranked sync (matches prior leaderboard-ranked-sync.service). */
export const scoresaberScoresBulkUpsertSet = {
  playerId: sql`excluded."playerId"`,
  leaderboardId: sql`excluded."leaderboardId"`,
  difficulty: sql`excluded."difficulty"`,
  characteristic: sql`excluded."characteristic"`,
  score: sql`excluded."score"`,
  accuracy: sql`excluded."accuracy"`,
  pp: sql`excluded."pp"`,
  missedNotes: sql`excluded."missedNotes"`,
  badCuts: sql`excluded."badCuts"`,
  maxCombo: sql`excluded."maxCombo"`,
  fullCombo: sql`excluded."fullCombo"`,
  modifiers: sql`excluded."modifiers"`,
  hmd: sql`excluded."hmd"`,
  rightController: sql`excluded."rightController"`,
  leftController: sql`excluded."leftController"`,
  timestamp: sql`excluded."timestamp"`,
} as const;

export class ScoreSaberScoresRepository {
  public static async deleteByPlayerId(playerId: string): Promise<void> {
    await db.delete(scoreSaberScoresTable).where(eq(scoreSaberScoresTable.playerId, playerId));
  }

  public static async deleteByScoreId(scoreId: number): Promise<void> {
    await db.delete(scoreSaberScoresTable).where(eq(scoreSaberScoresTable.scoreId, scoreId));
  }

  public static async findRowByScoreId(scoreId: number): Promise<ScoreSaberScoreRow | undefined> {
    const [row] = await db
      .select()
      .from(scoreSaberScoresTable)
      .where(eq(scoreSaberScoresTable.scoreId, scoreId))
      .limit(1);
    return row;
  }

  public static async rowExistsByScoreId(scoreId: number): Promise<boolean> {
    const rows = await db
      .select({ scoreId: scoreSaberScoresTable.scoreId })
      .from(scoreSaberScoresTable)
      .where(eq(scoreSaberScoresTable.scoreId, scoreId))
      .limit(1);
    return rows.length > 0;
  }

  public static async existsByScoreIdAndScore(
    scoreId: number,
    scoreValue: number
  ): Promise<boolean> {
    const rows = await db
      .select({ exists: sql`1` })
      .from(scoreSaberScoresTable)
      .where(and(eq(scoreSaberScoresTable.scoreId, scoreId), eq(scoreSaberScoresTable.score, scoreValue)))
      .limit(1);
    return rows.length > 0;
  }

  public static async findByPlayerAndLeaderboard(
    playerId: string,
    leaderboardId: number
  ): Promise<ScoreSaberScoreRow | undefined> {
    const rows = await db
      .select()
      .from(scoreSaberScoresTable)
      .where(
        and(
          eq(scoreSaberScoresTable.playerId, playerId),
          eq(scoreSaberScoresTable.leaderboardId, leaderboardId)
        )
      )
      .limit(1);
    return rows[0];
  }

  public static async upsertScore(row: ScoreSaberScoreUpsertRow): Promise<void> {
    await db
      .insert(scoreSaberScoresTable)
      .values(row)
      .onConflictDoUpdate({
        target: scoreSaberScoresTable.scoreId,
        set: row,
      })
      .returning({ scoreId: scoreSaberScoresTable.scoreId });
  }

  public static async bulkUpsertScores(rows: ScoreSaberScoreUpsertRow[]): Promise<void> {
    if (rows.length === 0) return;
    await db.insert(scoreSaberScoresTable).values(rows).onConflictDoUpdate({
      target: scoreSaberScoresTable.scoreId,
      set: scoresaberScoresBulkUpsertSet,
    });
  }

  public static async countByPlayerId(playerId: string): Promise<number> {
    const [row] = await db
      .select({ count: count() })
      .from(scoreSaberScoresTable)
      .where(eq(scoreSaberScoresTable.playerId, playerId));
    return row?.count ?? 0;
  }

  public static async countByLeaderboardId(leaderboardId: number): Promise<number> {
    const [row] = await db
      .select({ count: count() })
      .from(scoreSaberScoresTable)
      .where(eq(scoreSaberScoresTable.leaderboardId, leaderboardId));
    return row?.count ?? 0;
  }

  public static async countByConditions(conditions: SQL[]): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(scoreSaberScoresTable)
      .where(and(...conditions));
    return Number(row?.count ?? 0);
  }

  public static async findRowsByConditions(
    conditions: SQL[],
    orderBy: SQL | AnyColumn,
    limit: number,
    offset: number
  ): Promise<ScoreSaberScoreRow[]> {
    return db
      .select()
      .from(scoreSaberScoresTable)
      .where(and(...conditions))
      .orderBy(orderBy as SQL)
      .limit(limit)
      .offset(offset);
  }

  public static async selectTopScoresRows(limit: number, offset: number): Promise<ScoreSaberScoreRow[]> {
    return db
      .select()
      .from(scoreSaberScoresTable)
      .where(gt(scoreSaberScoresTable.pp, 0))
      .orderBy(desc(scoreSaberScoresTable.pp))
      .limit(limit)
      .offset(offset);
  }

  public static async selectTopPp(limit: number = 50): Promise<{ pp: number }[]> {
    return db
      .select({ pp: scoreSaberScoresTable.pp })
      .from(scoreSaberScoresTable)
      .where(gt(scoreSaberScoresTable.pp, 0))
      .orderBy(desc(scoreSaberScoresTable.pp))
      .limit(limit);
  }

  public static async selectPpAndScoreIdByPlayer(
    playerId: string
  ): Promise<{ pp: number; scoreId: number }[]> {
    return db
      .select({
        pp: scoreSaberScoresTable.pp,
        scoreId: scoreSaberScoresTable.scoreId,
      })
      .from(scoreSaberScoresTable)
      .where(and(eq(scoreSaberScoresTable.playerId, playerId), gt(scoreSaberScoresTable.pp, 0)))
      .orderBy(desc(scoreSaberScoresTable.pp));
  }

  public static async selectPpByPlayer(playerId: string): Promise<{ pp: number }[]> {
    return db
      .select({ pp: scoreSaberScoresTable.pp })
      .from(scoreSaberScoresTable)
      .where(and(eq(scoreSaberScoresTable.playerId, playerId), gt(scoreSaberScoresTable.pp, 0)))
      .orderBy(desc(scoreSaberScoresTable.pp));
  }

  public static async selectRankedRowsByPlayerId(playerId: string): Promise<ScoreSaberScoreRow[]> {
    return db
      .select()
      .from(scoreSaberScoresTable)
      .where(and(eq(scoreSaberScoresTable.playerId, playerId), gt(scoreSaberScoresTable.pp, 0)));
  }

  public static async selectAverageAccuracies(playerId: string): Promise<{
    averageAccuracy: number;
    unrankedAccuracy: number;
  }> {
    const [result] = await db
      .select({
        averageAccuracy: sql<number>`coalesce(avg(${scoreSaberScoresTable.accuracy}), 0)`,
        unrankedAccuracy: sql<number>`coalesce(avg(case when ${scoreSaberScoresTable.pp} = 0 then ${scoreSaberScoresTable.accuracy} end), 0)`,
      })
      .from(scoreSaberScoresTable)
      .where(
        and(
          eq(scoreSaberScoresTable.playerId, playerId),
          gte(scoreSaberScoresTable.accuracy, 0),
          lte(scoreSaberScoresTable.accuracy, 100)
        )
      );

    return {
      averageAccuracy: Number(result?.averageAccuracy ?? 0),
      unrankedAccuracy: Number(result?.unrankedAccuracy ?? 0),
    };
  }

  public static async countFriendScoresOnLeaderboard(
    friendIds: string[],
    leaderboardId: number
  ): Promise<number> {
    const conditions = and(
      inArray(scoreSaberScoresTable.playerId, friendIds),
      eq(scoreSaberScoresTable.leaderboardId, leaderboardId)
    );
    const [{ total }] = await db
      .select({ total: sql<number>`cast(count(*) as integer)` })
      .from(scoreSaberScoresTable)
      .where(conditions);
    return total;
  }

  public static async findFriendScoresOnLeaderboardPage(
    friendIds: string[],
    leaderboardId: number,
    limit: number,
    offset: number
  ): Promise<ScoreSaberScoreRow[]> {
    const conditions = and(
      inArray(scoreSaberScoresTable.playerId, friendIds),
      eq(scoreSaberScoresTable.leaderboardId, leaderboardId)
    );
    return db
      .select()
      .from(scoreSaberScoresTable)
      .where(conditions)
      .orderBy(desc(scoreSaberScoresTable.score))
      .limit(limit)
      .offset(offset);
  }

  public static async selectHmdByPlayerId(playerId: string, limit?: number): Promise<{ hmd: HMD }[]> {
    const q = db
      .select({ hmd: scoreSaberScoresTable.hmd })
      .from(scoreSaberScoresTable)
      .where(eq(scoreSaberScoresTable.playerId, playerId));
    return limit != null ? q.limit(limit) : q;
  }

  public static async selectSnapshotsByLeaderboardAndScoreIds(
    leaderboardId: number,
    scoreIds: number[]
  ): Promise<{ scoreId: number; score: number; pp: number }[]> {
    if (scoreIds.length === 0) return [];
    return db
      .select({
        scoreId: scoreSaberScoresTable.scoreId,
        score: scoreSaberScoresTable.score,
        pp: scoreSaberScoresTable.pp,
      })
      .from(scoreSaberScoresTable)
      .where(
        and(
          inArray(scoreSaberScoresTable.scoreId, scoreIds),
          eq(scoreSaberScoresTable.leaderboardId, leaderboardId)
        )
      );
  }

  public static async selectChartRowsByPlayer(playerId: string): Promise<
    {
      accuracy: number;
      pp: number;
      timestamp: Date;
      leaderboardId: number;
      difficulty: ScoreSaberScoreRow["difficulty"];
      songName: string | null;
      stars: number | null;
    }[]
  > {
    return db
      .select({
        accuracy: scoreSaberScoresTable.accuracy,
        pp: scoreSaberScoresTable.pp,
        timestamp: scoreSaberScoresTable.timestamp,
        leaderboardId: scoreSaberLeaderboardsTable.id,
        difficulty: scoreSaberLeaderboardsTable.difficulty,
        songName: scoreSaberLeaderboardsTable.songName,
        stars: scoreSaberLeaderboardsTable.stars,
      })
      .from(scoreSaberScoresTable)
      .innerJoin(
        scoreSaberLeaderboardsTable,
        eq(scoreSaberScoresTable.leaderboardId, scoreSaberLeaderboardsTable.id)
      )
      .where(and(eq(scoreSaberScoresTable.playerId, playerId), gt(scoreSaberScoresTable.pp, 0)))
      .orderBy(desc(scoreSaberScoresTable.timestamp));
  }

  public static async selectScoresJoinedLeaderboardsWhere(
    conditions: SQL[]
  ): Promise<{ scoreRow: ScoreSaberScoreRow; lbRow: typeof scoreSaberLeaderboardsTable.$inferSelect }[]> {
    return db
      .select({
        scoreRow: scoreSaberScoresTable,
        lbRow: scoreSaberLeaderboardsTable,
      })
      .from(scoreSaberScoresTable)
      .innerJoin(
        scoreSaberLeaderboardsTable,
        eq(scoreSaberScoresTable.leaderboardId, scoreSaberLeaderboardsTable.id)
      )
      .where(and(...conditions));
  }

  public static async getApproximateTotalRowCount(): Promise<number> {
    const result = await db.execute<{ count: number }>(sql`
      SELECT GREATEST(0, reltuples)::bigint::integer AS count
      FROM pg_class
      WHERE oid = 'scoresaber-scores'::regclass
    `);
    return Number(result.rows[0]?.count ?? 0);
  }
}
