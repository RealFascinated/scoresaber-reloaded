import { HMD } from "@ssr/common/hmds";
import type { AnyColumn, SQL } from "drizzle-orm";
import { and, count, desc, eq, getTableColumns, gt, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "../db";
import {
  scoreSaberAccountsTable,
  scoreSaberLeaderboardsTable,
  scoreSaberScoresTable,
  type ScoreSaberScoreRow,
} from "../db/schema";
import { TableCountsRepository } from "./table-counts.repository";

export type ScoreSaberScoreInsertRow = typeof scoreSaberScoresTable.$inferInsert;

export type ScoreSaberPlayerScoreStatistics = {
  totalScore: number;
  totalRankedScore: number;
  totalRankedScores: number;
  totalUnrankedScores: number;
  totalScores: number;
  averageRankedAccuracy: number;
  averageUnrankedAccuracy: number;
  averageAccuracy: number;
  aPlays: number;
  sPlays: number;
  spPlays: number;
  ssPlays: number;
  sspPlays: number;
  godPlays: number;
};

export const emptyScoreSaberPlayerScoreStatistics = (): ScoreSaberPlayerScoreStatistics => ({
  totalScore: 0,
  totalRankedScore: 0,
  totalRankedScores: 0,
  totalUnrankedScores: 0,
  totalScores: 0,
  averageRankedAccuracy: 0,
  averageUnrankedAccuracy: 0,
  averageAccuracy: 0,
  aPlays: 0,
  sPlays: 0,
  spPlays: 0,
  ssPlays: 0,
  sspPlays: 0,
  godPlays: 0,
});

export class ScoreSaberScoresRepository {
  public static async deleteByScoreId(scoreId: number): Promise<void> {
    await db.delete(scoreSaberScoresTable).where(eq(scoreSaberScoresTable.scoreId, scoreId));
  }

  public static async findRowByScoreId(scoreId: number): Promise<ScoreSaberScoreRow | undefined> {
    const [row] = await db
      .select()
      .from(scoreSaberScoresTable)
      .where(eq(scoreSaberScoresTable.scoreId, scoreId));
    return row;
  }

  public static async rowExistsByScoreId(scoreId: number): Promise<boolean> {
    const rows = await db
      .select({ scoreId: scoreSaberScoresTable.scoreId })
      .from(scoreSaberScoresTable)
      .where(eq(scoreSaberScoresTable.scoreId, scoreId));
    return rows.length > 0;
  }

  public static async findExistingScoreIds(scoreIds: number[]): Promise<Set<number>> {
    if (scoreIds.length === 0) {
      return new Set();
    }

    const rows = await db
      .select({ scoreId: scoreSaberScoresTable.scoreId })
      .from(scoreSaberScoresTable)
      .where(inArray(scoreSaberScoresTable.scoreId, scoreIds));
    return new Set(rows.map(row => row.scoreId));
  }

  public static async existsByScoreIdAndScore(scoreId: number, scoreValue: number): Promise<boolean> {
    const rows = await db
      .select({ exists: sql`1` })
      .from(scoreSaberScoresTable)
      .where(and(eq(scoreSaberScoresTable.scoreId, scoreId), eq(scoreSaberScoresTable.score, scoreValue)));
    return rows.length > 0;
  }

  public static async findByPlayerAndLeaderboard(
    playerId: string,
    leaderboardId: number
  ): Promise<ScoreSaberScoreRow | undefined> {
    const [row] = await db
      .select()
      .from(scoreSaberScoresTable)
      .where(
        and(
          eq(scoreSaberScoresTable.playerId, playerId),
          eq(scoreSaberScoresTable.leaderboardId, leaderboardId)
        )
      )
      .orderBy(desc(scoreSaberScoresTable.timestamp), desc(scoreSaberScoresTable.scoreId))
      .limit(1);
    return row;
  }

  public static async insertScore(row: ScoreSaberScoreInsertRow): Promise<boolean> {
    const result = await db
      .insert(scoreSaberScoresTable)
      .values(row)
      .onConflictDoNothing({ target: scoreSaberScoresTable.scoreId })
      .returning({ scoreId: scoreSaberScoresTable.scoreId });
    return result.length > 0;
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

  public static async getTopScores(limit: number, offset: number): Promise<ScoreSaberScoreRow[]> {
    return db
      .select(getTableColumns(scoreSaberScoresTable))
      .from(scoreSaberScoresTable)
      .innerJoin(scoreSaberAccountsTable, eq(scoreSaberScoresTable.playerId, scoreSaberAccountsTable.id))
      .where(and(gt(scoreSaberScoresTable.pp, 0), eq(scoreSaberAccountsTable.banned, false)))
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

  public static async getPpAndScoreIdByPlayer(playerId: string): Promise<{ pp: number; scoreId: number }[]> {
    return db
      .select({
        pp: scoreSaberScoresTable.pp,
        scoreId: scoreSaberScoresTable.scoreId,
      })
      .from(scoreSaberScoresTable)
      .where(and(eq(scoreSaberScoresTable.playerId, playerId), gt(scoreSaberScoresTable.pp, 0)))
      .orderBy(desc(scoreSaberScoresTable.pp));
  }

  public static async getPpByPlayer(playerId: string): Promise<{ pp: number }[]> {
    return db
      .select({ pp: scoreSaberScoresTable.pp })
      .from(scoreSaberScoresTable)
      .where(and(eq(scoreSaberScoresTable.playerId, playerId), gt(scoreSaberScoresTable.pp, 0)))
      .orderBy(desc(scoreSaberScoresTable.pp));
  }

  public static async getRankedRowsByPlayerId(playerId: string): Promise<ScoreSaberScoreRow[]> {
    return db
      .select()
      .from(scoreSaberScoresTable)
      .where(and(eq(scoreSaberScoresTable.playerId, playerId), gt(scoreSaberScoresTable.pp, 0)));
  }

  public static async getPlayerScoreStatistics(playerId: string): Promise<ScoreSaberPlayerScoreStatistics> {
    const [scoreStats] = await db
      .select({
        totalScore: sql<number>`(coalesce(sum(${scoreSaberScoresTable.score}), 0))::double precision`,
        totalRankedScore: sql<number>`(coalesce(sum(case when ${scoreSaberScoresTable.pp} > 0 then ${scoreSaberScoresTable.score} else 0 end), 0))::double precision`,
        totalRankedScores: sql<number>`(coalesce(sum(case when ${scoreSaberScoresTable.pp} > 0 then 1 else 0 end), 0))::double precision`,
        totalUnrankedScores: sql<number>`(coalesce(sum(case when ${scoreSaberScoresTable.pp} = 0 then 1 else 0 end), 0))::double precision`,
        totalScores: sql<number>`(coalesce(count(*), 0))::double precision`,
        averageRankedAccuracy: sql<number>`coalesce(avg(case when ${scoreSaberScoresTable.pp} > 0 then ${scoreSaberScoresTable.accuracy} end), 0)`,
        averageUnrankedAccuracy: sql<number>`coalesce(avg(case when ${scoreSaberScoresTable.pp} = 0 then ${scoreSaberScoresTable.accuracy} end), 0)`,
        averageAccuracy: sql<number>`coalesce(avg(${scoreSaberScoresTable.accuracy}), 0)`,
        aPlays: sql<number>`(coalesce(sum(case when ${scoreSaberScoresTable.pp} > 0 and ${scoreSaberScoresTable.accuracy} >= 70 and ${scoreSaberScoresTable.accuracy} < 80 then 1 else 0 end), 0))::double precision`,
        sPlays: sql<number>`(coalesce(sum(case when ${scoreSaberScoresTable.pp} > 0 and ${scoreSaberScoresTable.accuracy} >= 80 and ${scoreSaberScoresTable.accuracy} < 85 then 1 else 0 end), 0))::double precision`,
        spPlays: sql<number>`(coalesce(sum(case when ${scoreSaberScoresTable.pp} > 0 and ${scoreSaberScoresTable.accuracy} >= 85 and ${scoreSaberScoresTable.accuracy} < 90 then 1 else 0 end), 0))::double precision`,
        ssPlays: sql<number>`(coalesce(sum(case when ${scoreSaberScoresTable.pp} > 0 and ${scoreSaberScoresTable.accuracy} >= 90 and ${scoreSaberScoresTable.accuracy} < 95 then 1 else 0 end), 0))::double precision`,
        sspPlays: sql<number>`(coalesce(sum(case when ${scoreSaberScoresTable.pp} > 0 and ${scoreSaberScoresTable.accuracy} >= 95 and ${scoreSaberScoresTable.accuracy} < 98 then 1 else 0 end), 0))::double precision`,
        godPlays: sql<number>`(coalesce(sum(case when ${scoreSaberScoresTable.pp} > 0 and ${scoreSaberScoresTable.accuracy} >= 98 then 1 else 0 end), 0))::double precision`,
      })
      .from(scoreSaberScoresTable)
      .where(and(eq(scoreSaberScoresTable.playerId, playerId), gte(scoreSaberScoresTable.accuracy, 0)));

    if (!scoreStats) {
      return emptyScoreSaberPlayerScoreStatistics();
    }

    return {
      totalScore: Number(scoreStats.totalScore),
      totalRankedScore: Number(scoreStats.totalRankedScore),
      totalRankedScores: Number(scoreStats.totalRankedScores),
      totalUnrankedScores: Number(scoreStats.totalUnrankedScores),
      totalScores: Number(scoreStats.totalScores),
      averageRankedAccuracy: Number(scoreStats.averageRankedAccuracy),
      averageUnrankedAccuracy: Number(scoreStats.averageUnrankedAccuracy),
      averageAccuracy: Number(scoreStats.averageAccuracy),
      aPlays: Number(scoreStats.aPlays),
      sPlays: Number(scoreStats.sPlays),
      spPlays: Number(scoreStats.spPlays),
      ssPlays: Number(scoreStats.ssPlays),
      sspPlays: Number(scoreStats.sspPlays),
      godPlays: Number(scoreStats.godPlays),
    };
  }

  public static async getAverageAccuracies(playerId: string): Promise<{
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

  public static async getHmdByPlayerId(playerId: string, limit?: number): Promise<{ hmd: HMD }[]> {
    const q = db
      .select({ hmd: scoreSaberScoresTable.hmd })
      .from(scoreSaberScoresTable)
      .where(eq(scoreSaberScoresTable.playerId, playerId));
    return limit != null ? q.limit(limit) : q;
  }

  public static async getChartRowsByPlayer(playerId: string): Promise<
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

  public static async selectDistinctLeaderboardIdsByPlayerId(playerId: string): Promise<number[]> {
    const rows = await db
      .select({ leaderboardId: scoreSaberScoresTable.leaderboardId })
      .from(scoreSaberScoresTable)
      .where(eq(scoreSaberScoresTable.playerId, playerId))
      .groupBy(scoreSaberScoresTable.leaderboardId);
    return rows.map(r => r.leaderboardId);
  }

  public static async countTotal(): Promise<number> {
    const counts = await TableCountsRepository.getCounts();
    return counts.scoresaberScores;
  }
}
