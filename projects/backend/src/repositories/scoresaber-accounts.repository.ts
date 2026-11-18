import { and, asc, count, desc, eq, gte, ilike, inArray, isNotNull, or, sql } from "drizzle-orm";
import { db } from "../db";
import { scoreSaberAccountsTable, type ScoreSaberAccountRow } from "../db/schema";
import { TableCountsRepository } from "./table-counts.repository";

export type ScoreSaberAccountInsert = typeof scoreSaberAccountsTable.$inferInsert;

export class ScoreSaberAccountsRepository {
  public static async findRowById(id: string) {
    const [row] = await db.select().from(scoreSaberAccountsTable).where(eq(scoreSaberAccountsTable.id, id));
    return row;
  }

  public static async findManyByIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }
    return db.select().from(scoreSaberAccountsTable).where(inArray(scoreSaberAccountsTable.id, ids));
  }

  public static async findExistingIds(ids: string[]) {
    if (ids.length === 0) {
      return new Set();
    }
    const rows = await db
      .select({ id: scoreSaberAccountsTable.id })
      .from(scoreSaberAccountsTable)
      .where(inArray(scoreSaberAccountsTable.id, ids));
    return new Set(rows.map(row => row.id));
  }

  public static async insert(row: ScoreSaberAccountInsert) {
    await db.insert(scoreSaberAccountsTable).values(row).onConflictDoNothing({
      target: scoreSaberAccountsTable.id,
    });
  }

  public static async existsById(id: string) {
    const rows = await db
      .select({ exists: sql`1` })
      .from(scoreSaberAccountsTable)
      .where(eq(scoreSaberAccountsTable.id, id));
    return rows.length > 0;
  }

  public static async updateAccount(id: string, patch: Partial<Omit<ScoreSaberAccountRow, "id">>) {
    type UpdatableKey = Exclude<keyof ScoreSaberAccountRow, "id">;
    const entries = Object.entries(patch) as [UpdatableKey, ScoreSaberAccountRow[UpdatableKey]][];
    if (entries.length === 0) {
      return false;
    }

    const changeConditions = entries.map(([key, value]) => {
      const column = scoreSaberAccountsTable[key];
      return sql`${column} IS DISTINCT FROM ${value}`;
    });

    const result = await db
      .update(scoreSaberAccountsTable)
      .set(patch)
      .where(and(eq(scoreSaberAccountsTable.id, id), or(...changeConditions)));

    return (result.rowCount ?? 0) > 0;
  }

  public static async searchIdsByNameIlike(pattern: string, limit: number) {
    return db
      .select({ id: scoreSaberAccountsTable.id })
      .from(scoreSaberAccountsTable)
      .where(ilike(scoreSaberAccountsTable.name, pattern))
      .orderBy(asc(scoreSaberAccountsTable.name))
      .limit(limit);
  }

  public static async selectHmdCountsActiveAccounts() {
    return db
      .select({
        hmd: scoreSaberAccountsTable.hmd,
        c: count(),
      })
      .from(scoreSaberAccountsTable)
      .where(and(isNotNull(scoreSaberAccountsTable.hmd), eq(scoreSaberAccountsTable.inactive, false)))
      .groupBy(scoreSaberAccountsTable.hmd);
  }

  /**
   * Selects the players whose BeatLeader scores still need seeding, skipping the ones
   * that failed an attempt recently. The backoff grows with the attempt count (2, 4,
   * 8 ... minutes, capped at a day) so a player that can never be seeded settles into
   * a daily retry instead of being queued again on every 10-minute cycle, which kept
   * the queue from ever draining.
   *
   * @returns the ids to queue
   */
  public static async selectIdsNeedingBeatLeaderSeed(limit?: number) {
    const q = db
      .select({ id: scoreSaberAccountsTable.id })
      .from(scoreSaberAccountsTable)
      .where(
        and(
          eq(scoreSaberAccountsTable.seededBeatLeaderScores, false),
          sql`(
            ${scoreSaberAccountsTable.beatLeaderSeedLastAttempt} IS NULL
            OR ${scoreSaberAccountsTable.beatLeaderSeedLastAttempt} < (now() AT TIME ZONE 'UTC') - least(
              power(2, least(${scoreSaberAccountsTable.beatLeaderSeedAttempts}, 10)) * interval '1 minute',
              interval '1 day'
            )
          )`
        )
      )
      .orderBy(desc(scoreSaberAccountsTable.joinedDate));
    return limit != null ? q.limit(limit) : q;
  }

  /**
   * Gets how far the BeatLeader backfill got for a player, so a retry resumes where
   * the last attempt stopped instead of starting the score history over.
   *
   * @param id the player's id
   * @returns the processed page count and attempt count, or undefined if not tracked
   */
  public static async findBeatLeaderSeedProgress(id: string) {
    const [row] = await db
      .select({
        page: scoreSaberAccountsTable.beatLeaderSeedPage,
        attempts: scoreSaberAccountsTable.beatLeaderSeedAttempts,
      })
      .from(scoreSaberAccountsTable)
      .where(eq(scoreSaberAccountsTable.id, id));
    return row;
  }

  public static async selectIdsNeedingScoreSeed(limit?: number) {
    const q = db
      .select({ id: scoreSaberAccountsTable.id })
      .from(scoreSaberAccountsTable)
      .where(and(eq(scoreSaberAccountsTable.seededScores, false)));
    return limit != null ? q.limit(limit) : q;
  }

  public static async markInactiveWhereIdNotIn(activeIds: string[]) {
    const inactiveUpdate = await db
      .update(scoreSaberAccountsTable)
      .set({ inactive: true })
      .where(
        and(
          eq(scoreSaberAccountsTable.inactive, false),
          sql`NOT (${scoreSaberAccountsTable.id} = ANY(${sql.param(activeIds)}))`
        )
      );
    return { rowCount: inactiveUpdate.rowCount ?? null };
  }

  public static async countInactive() {
    const counts = await TableCountsRepository.getCounts();
    return counts.scoresaberInactiveAccounts;
  }

  public static async countTotal() {
    const counts = await TableCountsRepository.getCounts();
    return counts.scoresaberAccounts;
  }

  public static async countJoinedSince(date: Date) {
    const [row] = await db
      .select({ c: count() })
      .from(scoreSaberAccountsTable)
      .where(gte(scoreSaberAccountsTable.joinedDate, date));
    return row?.c ?? 0;
  }

  public static async selectAllIds() {
    return db.select({ id: scoreSaberAccountsTable.id }).from(scoreSaberAccountsTable);
  }
}
