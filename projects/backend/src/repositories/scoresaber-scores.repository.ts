import { HMD } from "@ssr/common/hmds";
import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import type { AnyColumn, SQL } from "drizzle-orm";
import { and, count, desc, eq, gt, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "../db";
import {
  scoreSaberAccountsTable,
  scoreSaberLeaderboardRealmsTable,
  scoreSaberLeaderboardsTable,
  scoreSaberScoreHistoryTable,
  scoreSaberScoreRealmsTable,
  scoreSaberScoresTable,
  type ScoreSaberLeaderboardRow,
  type ScoreSaberScoreHistoryRow,
  type ScoreSaberScoreRow,
} from "../db/schema";
import {
  leaderboardRealmJoinOn,
  resolvedLeaderboardColumns,
  resolvedScoreColumns,
  scorePpExpr,
  scoreRealmJoinOn,
} from "./realm-columns";
import {
  ScoreSaberScoreHistoryRepository,
  scoreRowToHistoryInsert,
} from "./scoresaber-score-history.repository";
import { TableCountsRepository } from "./table-counts.repository";

/**
 * A score to store. `pp` is the score's pp in the realm the row is written for
 * (see the `realmId` argument of the write methods); it lives in the score-realms table.
 */
export type ScoreSaberScoreInsertRow = typeof scoreSaberScoresTable.$inferInsert & { pp: number };

type ScoreBaseInsertRow = typeof scoreSaberScoresTable.$inferInsert;

function splitInsertRow(row: ScoreSaberScoreInsertRow): { base: ScoreBaseInsertRow; pp: number } {
  const { pp, ...base } = row;
  return { base, pp };
}

type Executor = Pick<typeof db, "insert" | "delete">;

/**
 * Writes the realm pp rows for the given scores: positive pp is upserted, anything else removes
 * the row so the table stays sparse.
 */
async function writeRealmPp(
  executor: Executor,
  realmId: number,
  entries: { scoreId: number; playerId: string; leaderboardId: number; pp: number }[]
): Promise<void> {
  const ranked = entries.filter(entry => entry.pp > 0);
  const unranked = entries.filter(entry => !(entry.pp > 0));

  if (unranked.length > 0) {
    await executor.delete(scoreSaberScoreRealmsTable).where(
      and(
        eq(scoreSaberScoreRealmsTable.realmId, realmId),
        inArray(
          scoreSaberScoreRealmsTable.scoreId,
          unranked.map(entry => entry.scoreId)
        )
      )
    );
  }

  if (ranked.length > 0) {
    await executor
      .insert(scoreSaberScoreRealmsTable)
      .values(ranked.map(entry => ({ ...entry, realmId })))
      .onConflictDoUpdate({
        target: [scoreSaberScoreRealmsTable.scoreId, scoreSaberScoreRealmsTable.realmId],
        set: { pp: sql`excluded."pp"` },
        setWhere: sql`${scoreSaberScoreRealmsTable.pp} is distinct from excluded."pp"`,
      });
  }
}

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
  /**
   * Finds which of the given players have a ScoreSaber score within the time range.
   *
   * Used to disambiguate which SSR account actually played when multiple accounts are
   * linked to the same BeatLeader player.
   *
   * @param playerIds the candidate player IDs
   * @param from the start of the time range (inclusive)
   * @param to the end of the time range (inclusive)
   * @returns the player IDs that have a score in the range
   */
  public static async findPlayerIdsInTimeRange(playerIds: string[], from: Date, to: Date): Promise<string[]> {
    const rows = await db
      .select({ playerId: scoreSaberScoresTable.playerId })
      .from(scoreSaberScoresTable)
      .where(
        and(
          inArray(scoreSaberScoresTable.playerId, playerIds),
          gte(scoreSaberScoresTable.timestamp, from),
          lte(scoreSaberScoresTable.timestamp, to)
        )
      )
      .limit(100);
    return [...new Set(rows.map(row => row.playerId))];
  }

  public static async findRowByScoreId(
    scoreId: number,
    realmId: number
  ): Promise<ScoreSaberScoreRow | undefined> {
    const [row] = await db
      .select(resolvedScoreColumns())
      .from(scoreSaberScoresTable)
      .leftJoin(scoreSaberScoreRealmsTable, scoreRealmJoinOn(realmId))
      .where(eq(scoreSaberScoresTable.scoreId, scoreId));
    return row;
  }

  /**
   * Finds a score by its id, whether it is still the player's current score or has since been
   * replaced by a better one and moved to the score history.
   *
   * @param scoreId the score to find
   * @param realmId the realm to resolve pp for current scores
   */
  public static async findAnyRowByScoreId(
    scoreId: number,
    realmId: number
  ): Promise<ScoreSaberScoreRow | ScoreSaberScoreHistoryRow | undefined> {
    return (
      (await ScoreSaberScoresRepository.findRowByScoreId(scoreId, realmId)) ??
      (await ScoreSaberScoreHistoryRepository.findRowByScoreId(scoreId))
    );
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
    leaderboardId: number,
    realmId: number
  ): Promise<ScoreSaberScoreRow | undefined> {
    const [row] = await db
      .select(resolvedScoreColumns())
      .from(scoreSaberScoresTable)
      .leftJoin(scoreSaberScoreRealmsTable, scoreRealmJoinOn(realmId))
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

  public static async insertScore(row: ScoreSaberScoreInsertRow, realmId: number): Promise<boolean> {
    const { base, pp } = splitInsertRow(row);
    return await db.transaction(async tx => {
      const result = await tx
        .insert(scoreSaberScoresTable)
        .values(base)
        // Untargeted so conflicts on both the scoreId primary key (same score
        // re-ingested) and the (playerId, leaderboardId) unique index (a
        // concurrent play from another ingestion path) are absorbed instead of
        // raising a unique violation.
        .onConflictDoNothing()
        .returning({ scoreId: scoreSaberScoresTable.scoreId });
      if (result.length === 0) {
        return false;
      }

      await writeRealmPp(tx, realmId, [
        { scoreId: base.scoreId, playerId: base.playerId, leaderboardId: base.leaderboardId, pp },
      ]);
      return true;
    });
  }

  /**
   * Atomically replaces a player's current score on a leaderboard.
   *
   * Snapshots the row currently stored for the player+leaderboard to the
   * score-history table and upserts the new row in a single transaction, so a
   * crash can no longer leave the player without a current row (the previous
   * delete-then-insert sequence had that window). The upsert also handles the
   * (playerId, leaderboardId) unique constraint for concurrent writers: the
   * newest play wins, and when this incoming play loses the race nothing is
   * changed.
   *
   * @param row the new score row to store
   * @param realmId the realm the row's pp belongs to; the replaced score's pp rows are removed for every realm
   * @returns whether the new row was inserted (false when a concurrent, newer
   *   row already holds the slot)
   */
  public static async replaceScore(row: ScoreSaberScoreInsertRow, realmId: number): Promise<boolean> {
    const { base: insertRow, pp } = splitInsertRow(row);
    return await db.transaction(async tx => {
      // Re-read the current row inside the transaction so the snapshot reflects
      // the row actually being replaced (a concurrent writer may have changed
      // it since the caller read it).
      const [previousRow] = await tx
        .select(resolvedScoreColumns())
        .from(scoreSaberScoresTable)
        .leftJoin(scoreSaberScoreRealmsTable, scoreRealmJoinOn(DEFAULT_REALM_ID))
        .where(
          and(
            eq(scoreSaberScoresTable.playerId, insertRow.playerId),
            eq(scoreSaberScoresTable.leaderboardId, insertRow.leaderboardId)
          )
        )
        .limit(1);

      let inserted: { scoreId: number } | undefined;
      try {
        const result = await tx
          .insert(scoreSaberScoresTable)
          .values(insertRow)
          .onConflictDoUpdate({
            target: [scoreSaberScoresTable.playerId, scoreSaberScoresTable.leaderboardId],
            set: insertRow,
            // Only overwrite the current row when the incoming play is newer, so
            // a concurrent (already committed) newer play is never downgraded.
            setWhere: sql`${scoreSaberScoresTable.timestamp} < excluded."timestamp"`,
          })
          .returning({ scoreId: scoreSaberScoresTable.scoreId });
        inserted = result[0];
      } catch (error) {
        // A concurrent writer inserted the same scoreId (primary key) — the play
        // is already recorded, so nothing to do.
        if ((error as { code?: string }).code === "23505") {
          return false;
        }
        throw error;
      }

      if (inserted != null && previousRow != null && previousRow.scoreId !== insertRow.scoreId) {
        // The replaced score leaves the current table, so its per-realm pp goes with it.
        await tx
          .delete(scoreSaberScoreRealmsTable)
          .where(eq(scoreSaberScoreRealmsTable.scoreId, previousRow.scoreId));
        await tx
          .insert(scoreSaberScoreHistoryTable)
          .values(scoreRowToHistoryInsert(previousRow))
          .onConflictDoNothing({
            target: [
              scoreSaberScoreHistoryTable.leaderboardId,
              scoreSaberScoreHistoryTable.playerId,
              scoreSaberScoreHistoryTable.score,
            ],
          });
      }

      if (inserted == null) {
        return false;
      }

      await writeRealmPp(tx, realmId, [
        {
          scoreId: insertRow.scoreId,
          playerId: insertRow.playerId,
          leaderboardId: insertRow.leaderboardId,
          pp,
        },
      ]);
      return true;
    });
  }

  /**
   * Upserts scores into the scores table in a single statement.
   *
   * New scores are inserted. Scores that already exist (same scoreId) keep their row; only
   * the realm's pp is updated, and only when the value actually differs.
   *
   * @param rows the score rows to upsert
   * @param realmId the realm the rows' pp belongs to
   */
  public static async upsertScores(rows: ScoreSaberScoreInsertRow[], realmId: number): Promise<void> {
    if (rows.length === 0) {
      return;
    }

    const split = rows.map(splitInsertRow);
    await db.transaction(async tx => {
      await tx
        .insert(scoreSaberScoresTable)
        .values(split.map(({ base }) => base))
        .onConflictDoNothing({ target: scoreSaberScoresTable.scoreId });

      // A conflicting (playerId, leaderboardId) row holds a different scoreId, so only write pp for
      // scores that now exist under the id we were given.
      const stored = await tx
        .select({ scoreId: scoreSaberScoresTable.scoreId })
        .from(scoreSaberScoresTable)
        .where(
          inArray(
            scoreSaberScoresTable.scoreId,
            split.map(({ base }) => base.scoreId)
          )
        );
      const storedIds = new Set(stored.map(row => row.scoreId));
      await writeRealmPp(
        tx,
        realmId,
        split
          .filter(({ base }) => storedIds.has(base.scoreId))
          .map(({ base, pp }) => ({
            scoreId: base.scoreId,
            playerId: base.playerId,
            leaderboardId: base.leaderboardId,
            pp,
          }))
      );
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

  /**
   * Counts scores matching the conditions. Conditions may reference {@link scorePpExpr}; pp is
   * resolved for `realmId`.
   */
  public static async countByConditions(conditions: SQL[], realmId: number): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(scoreSaberScoresTable)
      .leftJoin(scoreSaberScoreRealmsTable, scoreRealmJoinOn(realmId))
      .where(and(...conditions));
    return Number(row?.count ?? 0);
  }

  public static async findRowsByConditions(
    conditions: SQL[],
    orderBy: SQL | AnyColumn,
    limit: number,
    offset: number,
    realmId: number
  ): Promise<ScoreSaberScoreRow[]> {
    return db
      .select(resolvedScoreColumns())
      .from(scoreSaberScoresTable)
      .leftJoin(scoreSaberScoreRealmsTable, scoreRealmJoinOn(realmId))
      .where(and(...conditions))
      .orderBy(orderBy as SQL)
      .limit(limit)
      .offset(offset);
  }

  public static async getTopScores(
    limit: number,
    offset: number,
    realmId: number
  ): Promise<ScoreSaberScoreRow[]> {
    return db
      .select({ ...resolvedScoreColumns(), pp: scoreSaberScoreRealmsTable.pp })
      .from(scoreSaberScoreRealmsTable)
      .innerJoin(scoreSaberScoresTable, eq(scoreSaberScoresTable.scoreId, scoreSaberScoreRealmsTable.scoreId))
      .innerJoin(scoreSaberAccountsTable, eq(scoreSaberScoresTable.playerId, scoreSaberAccountsTable.id))
      .where(
        and(
          eq(scoreSaberScoreRealmsTable.realmId, realmId),
          gt(scoreSaberScoreRealmsTable.pp, 0),
          eq(scoreSaberAccountsTable.banned, false)
        )
      )
      .orderBy(desc(scoreSaberScoreRealmsTable.pp), desc(scoreSaberScoreRealmsTable.scoreId))
      .limit(limit)
      .offset(offset);
  }

  public static async selectTopPp(limit: number = 50, realmId: number): Promise<{ pp: number }[]> {
    return db
      .select({ pp: scoreSaberScoreRealmsTable.pp })
      .from(scoreSaberScoreRealmsTable)
      .innerJoin(scoreSaberAccountsTable, eq(scoreSaberScoreRealmsTable.playerId, scoreSaberAccountsTable.id))
      .where(
        and(
          eq(scoreSaberScoreRealmsTable.realmId, realmId),
          gt(scoreSaberScoreRealmsTable.pp, 0),
          eq(scoreSaberAccountsTable.banned, false)
        )
      )
      .orderBy(desc(scoreSaberScoreRealmsTable.pp))
      .limit(limit);
  }

  public static async getPpAndScoreIdByPlayer(
    playerId: string,
    realmId: number
  ): Promise<{ pp: number; scoreId: number }[]> {
    return db
      .select({
        pp: scoreSaberScoreRealmsTable.pp,
        scoreId: scoreSaberScoreRealmsTable.scoreId,
      })
      .from(scoreSaberScoreRealmsTable)
      .where(
        and(
          eq(scoreSaberScoreRealmsTable.realmId, realmId),
          eq(scoreSaberScoreRealmsTable.playerId, playerId),
          gt(scoreSaberScoreRealmsTable.pp, 0)
        )
      )
      .orderBy(desc(scoreSaberScoreRealmsTable.pp));
  }

  public static async getRankedRowsByPlayerId(
    playerId: string,
    realmId: number
  ): Promise<ScoreSaberScoreRow[]> {
    return db
      .select({ ...resolvedScoreColumns(), pp: scoreSaberScoreRealmsTable.pp })
      .from(scoreSaberScoreRealmsTable)
      .innerJoin(scoreSaberScoresTable, eq(scoreSaberScoresTable.scoreId, scoreSaberScoreRealmsTable.scoreId))
      .where(
        and(
          eq(scoreSaberScoreRealmsTable.realmId, realmId),
          eq(scoreSaberScoreRealmsTable.playerId, playerId),
          gt(scoreSaberScoreRealmsTable.pp, 0)
        )
      );
  }

  public static async getPlayerScoreStatistics(
    playerId: string,
    realmId: number
  ): Promise<ScoreSaberPlayerScoreStatistics> {
    const [scoreStats] = await db
      .select({
        totalScore: sql<number>`(coalesce(sum(${scoreSaberScoresTable.score}), 0))::double precision`,
        totalRankedScore: sql<number>`(coalesce(sum(case when ${scorePpExpr} > 0 then ${scoreSaberScoresTable.score} else 0 end), 0))::double precision`,
        totalRankedScores: sql<number>`(coalesce(sum(case when ${scorePpExpr} > 0 then 1 else 0 end), 0))::double precision`,
        totalUnrankedScores: sql<number>`(coalesce(sum(case when ${scorePpExpr} = 0 then 1 else 0 end), 0))::double precision`,
        totalScores: sql<number>`(coalesce(count(*), 0))::double precision`,
        averageRankedAccuracy: sql<number>`coalesce(avg(case when ${scorePpExpr} > 0 then ${scoreSaberScoresTable.accuracy} end), 0)`,
        averageUnrankedAccuracy: sql<number>`coalesce(avg(case when ${scorePpExpr} = 0 then ${scoreSaberScoresTable.accuracy} end), 0)`,
        averageAccuracy: sql<number>`coalesce(avg(${scoreSaberScoresTable.accuracy}), 0)`,
        aPlays: sql<number>`(coalesce(sum(case when ${scorePpExpr} > 0 and ${scoreSaberScoresTable.accuracy} >= 70 and ${scoreSaberScoresTable.accuracy} < 80 then 1 else 0 end), 0))::double precision`,
        sPlays: sql<number>`(coalesce(sum(case when ${scorePpExpr} > 0 and ${scoreSaberScoresTable.accuracy} >= 80 and ${scoreSaberScoresTable.accuracy} < 85 then 1 else 0 end), 0))::double precision`,
        spPlays: sql<number>`(coalesce(sum(case when ${scorePpExpr} > 0 and ${scoreSaberScoresTable.accuracy} >= 85 and ${scoreSaberScoresTable.accuracy} < 90 then 1 else 0 end), 0))::double precision`,
        ssPlays: sql<number>`(coalesce(sum(case when ${scorePpExpr} > 0 and ${scoreSaberScoresTable.accuracy} >= 90 and ${scoreSaberScoresTable.accuracy} < 95 then 1 else 0 end), 0))::double precision`,
        sspPlays: sql<number>`(coalesce(sum(case when ${scorePpExpr} > 0 and ${scoreSaberScoresTable.accuracy} >= 95 and ${scoreSaberScoresTable.accuracy} < 98 then 1 else 0 end), 0))::double precision`,
        godPlays: sql<number>`(coalesce(sum(case when ${scorePpExpr} > 0 and ${scoreSaberScoresTable.accuracy} >= 98 then 1 else 0 end), 0))::double precision`,
      })
      .from(scoreSaberScoresTable)
      .leftJoin(scoreSaberScoreRealmsTable, scoreRealmJoinOn(realmId))
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

  public static async getAverageAccuracies(
    playerId: string,
    realmId: number
  ): Promise<{
    averageAccuracy: number;
    unrankedAccuracy: number;
  }> {
    const [result] = await db
      .select({
        averageAccuracy: sql<number>`coalesce(avg(${scoreSaberScoresTable.accuracy}), 0)`,
        unrankedAccuracy: sql<number>`coalesce(avg(case when ${scorePpExpr} = 0 then ${scoreSaberScoresTable.accuracy} end), 0)`,
      })
      .from(scoreSaberScoresTable)
      .leftJoin(scoreSaberScoreRealmsTable, scoreRealmJoinOn(realmId))
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

  public static async countFollowingScoresOnLeaderboard(
    followingIds: string[],
    leaderboardId: number
  ): Promise<number> {
    const conditions = and(
      inArray(scoreSaberScoresTable.playerId, followingIds),
      eq(scoreSaberScoresTable.leaderboardId, leaderboardId)
    );
    const [{ total }] = await db
      .select({ total: sql<number>`cast(count(*) as integer)` })
      .from(scoreSaberScoresTable)
      .where(conditions);
    return total;
  }

  public static async findFollowingScoresOnLeaderboardPage(
    followingIds: string[],
    leaderboardId: number,
    limit: number,
    offset: number,
    realmId: number
  ): Promise<ScoreSaberScoreRow[]> {
    const conditions = and(
      inArray(scoreSaberScoresTable.playerId, followingIds),
      eq(scoreSaberScoresTable.leaderboardId, leaderboardId)
    );
    return db
      .select(resolvedScoreColumns())
      .from(scoreSaberScoresTable)
      .leftJoin(scoreSaberScoreRealmsTable, scoreRealmJoinOn(realmId))
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

  public static async getChartRowsByPlayer(
    playerId: string,
    realmId: number
  ): Promise<
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
        pp: scoreSaberScoreRealmsTable.pp,
        timestamp: scoreSaberScoresTable.timestamp,
        leaderboardId: scoreSaberLeaderboardsTable.id,
        difficulty: scoreSaberLeaderboardsTable.difficulty,
        songName: scoreSaberLeaderboardsTable.songName,
        stars: scoreSaberLeaderboardRealmsTable.stars,
      })
      .from(scoreSaberScoreRealmsTable)
      .innerJoin(scoreSaberScoresTable, eq(scoreSaberScoresTable.scoreId, scoreSaberScoreRealmsTable.scoreId))
      .innerJoin(
        scoreSaberLeaderboardsTable,
        eq(scoreSaberScoresTable.leaderboardId, scoreSaberLeaderboardsTable.id)
      )
      .leftJoin(
        scoreSaberLeaderboardRealmsTable,
        leaderboardRealmJoinOn(scoreSaberLeaderboardsTable, scoreSaberLeaderboardRealmsTable, realmId)
      )
      .where(
        and(
          eq(scoreSaberScoreRealmsTable.realmId, realmId),
          eq(scoreSaberScoreRealmsTable.playerId, playerId),
          gt(scoreSaberScoreRealmsTable.pp, 0)
        )
      )
      .orderBy(desc(scoreSaberScoresTable.timestamp));
  }

  /**
   * Sets a realm's pp for scores that are already stored; scores missing from the scores table are
   * skipped. Positive pp is upserted and anything else removes the realm row.
   *
   * @param realmId the realm the pp belongs to
   * @param entries the scores and their pp in the realm
   * @returns the number of scores that existed and were written
   */
  public static async setRealmPpForExistingScores(
    realmId: number,
    entries: { scoreId: number; pp: number }[]
  ): Promise<number> {
    if (entries.length === 0) {
      return 0;
    }
    const existing = await db
      .select({
        scoreId: scoreSaberScoresTable.scoreId,
        playerId: scoreSaberScoresTable.playerId,
        leaderboardId: scoreSaberScoresTable.leaderboardId,
      })
      .from(scoreSaberScoresTable)
      .where(
        inArray(
          scoreSaberScoresTable.scoreId,
          entries.map(entry => entry.scoreId)
        )
      );
    const ppByScoreId = new Map(entries.map(entry => [entry.scoreId, entry.pp]));
    await writeRealmPp(
      db,
      realmId,
      existing.map(row => ({ ...row, pp: ppByScoreId.get(row.scoreId) ?? 0 }))
    );
    return existing.length;
  }

  /**
   * Selects scores joined to their leaderboards, both resolved for `realmId`. Conditions may
   * reference {@link scorePpExpr}.
   */
  public static async selectScoresJoinedLeaderboardsWhere(
    conditions: SQL[],
    realmId: number
  ): Promise<{ scoreRow: ScoreSaberScoreRow; lbRow: ScoreSaberLeaderboardRow }[]> {
    return db
      .select({
        scoreRow: resolvedScoreColumns(),
        lbRow: resolvedLeaderboardColumns(),
      })
      .from(scoreSaberScoresTable)
      .leftJoin(scoreSaberScoreRealmsTable, scoreRealmJoinOn(realmId))
      .innerJoin(
        scoreSaberLeaderboardsTable,
        eq(scoreSaberScoresTable.leaderboardId, scoreSaberLeaderboardsTable.id)
      )
      .leftJoin(
        scoreSaberLeaderboardRealmsTable,
        leaderboardRealmJoinOn(scoreSaberLeaderboardsTable, scoreSaberLeaderboardRealmsTable, realmId)
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

  /**
   * Gets the ids of every player that has a score on any of the leaderboards.
   *
   * @param leaderboardIds the leaderboards to look at
   */
  public static async selectDistinctPlayerIdsByLeaderboardIds(leaderboardIds: number[]): Promise<string[]> {
    if (leaderboardIds.length === 0) {
      return [];
    }
    const rows = await db
      .selectDistinct({ playerId: scoreSaberScoresTable.playerId })
      .from(scoreSaberScoresTable)
      .where(inArray(scoreSaberScoresTable.leaderboardId, leaderboardIds));
    return rows.map(r => r.playerId);
  }

  /**
   * Counts the scores that have pp in a realm.
   *
   * @param realmId the realm to count ranked scores for
   */
  public static async countRealmScores(realmId: number): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(scoreSaberScoreRealmsTable)
      .where(and(eq(scoreSaberScoreRealmsTable.realmId, realmId), gt(scoreSaberScoreRealmsTable.pp, 0)));
    return Number(row?.count ?? 0);
  }

  public static async countTotal(): Promise<number> {
    const counts = await TableCountsRepository.getCounts();
    return counts.scoresaberScores;
  }
}
