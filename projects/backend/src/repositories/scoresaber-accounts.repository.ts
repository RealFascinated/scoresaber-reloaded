import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  ne,
  notInArray,
  sql,
} from "drizzle-orm";
import { db } from "../db";
import { scoreSaberAccountsTable, type ScoreSaberAccountRow } from "../db/schema";

/** Keeps each bulk UPDATE … FROM (VALUES …) under typical Postgres parameter limits (2 params per row). */
const MEDALS_BULK_UPDATE_CHUNK = 2000;

export type ScoreSaberAccountInsert = typeof scoreSaberAccountsTable.$inferInsert;

export class ScoreSaberAccountsRepository {
  public static async findRowById(id: string): Promise<ScoreSaberAccountRow | undefined> {
    const [row] = await db.select().from(scoreSaberAccountsTable).where(eq(scoreSaberAccountsTable.id, id));
    return row;
  }

  public static async insert(row: ScoreSaberAccountInsert): Promise<void> {
    await db.insert(scoreSaberAccountsTable).values(row).onConflictDoNothing({
      target: scoreSaberAccountsTable.id,
    });
  }

  public static async updateAccount(
    id: string,
    patch: Partial<Omit<ScoreSaberAccountRow, "id">>
  ): Promise<void> {
    await db.update(scoreSaberAccountsTable).set(patch).where(eq(scoreSaberAccountsTable.id, id));
  }

  public static async searchIdsByNameIlike(pattern: string, limit: number): Promise<{ id: string }[]> {
    return db
      .select({ id: scoreSaberAccountsTable.id })
      .from(scoreSaberAccountsTable)
      .where(ilike(scoreSaberAccountsTable.name, pattern))
      .orderBy(asc(scoreSaberAccountsTable.name))
      .limit(limit);
  }

  public static async selectCountryCountsActivePlayers(): Promise<{ country: string | null; c: number }[]> {
    return db
      .select({
        country: scoreSaberAccountsTable.country,
        c: count(),
      })
      .from(scoreSaberAccountsTable)
      .where(
        and(
          eq(scoreSaberAccountsTable.inactive, false),
          isNotNull(scoreSaberAccountsTable.country),
          ne(scoreSaberAccountsTable.country, "")
        )
      )
      .groupBy(scoreSaberAccountsTable.country)
      .orderBy(desc(count()));
  }

  public static async selectHmdCountsActiveAccounts(): Promise<{ hmd: string | null; c: number }[]> {
    return db
      .select({
        hmd: scoreSaberAccountsTable.hmd,
        c: count(),
      })
      .from(scoreSaberAccountsTable)
      .where(and(isNotNull(scoreSaberAccountsTable.hmd), eq(scoreSaberAccountsTable.inactive, false)))
      .groupBy(scoreSaberAccountsTable.hmd);
  }

  public static async selectIdsNeedingBeatLeaderSeed(limit?: number): Promise<{ id: string }[]> {
    const q = db
      .select({ id: scoreSaberAccountsTable.id })
      .from(scoreSaberAccountsTable)
      .where(
        and(
          eq(scoreSaberAccountsTable.seededBeatLeaderScores, false),
          eq(scoreSaberAccountsTable.banned, false)
        )
      );
    return limit != null ? q.limit(limit) : q;
  }

  public static async selectIdsNeedingScoreSeed(limit?: number): Promise<{ id: string }[]> {
    const q = db
      .select({ id: scoreSaberAccountsTable.id })
      .from(scoreSaberAccountsTable)
      .where(and(eq(scoreSaberAccountsTable.seededScores, false), eq(scoreSaberAccountsTable.banned, false)));
    return limit != null ? q.limit(limit) : q;
  }

  public static async markInactiveWhereIdNotIn(activeIds: string[]): Promise<{ rowCount: number | null }> {
    const inactiveUpdate = await db
      .update(scoreSaberAccountsTable)
      .set({ inactive: true })
      .where(activeIds.length > 0 ? notInArray(scoreSaberAccountsTable.id, activeIds) : sql`true`);
    return { rowCount: inactiveUpdate.rowCount ?? null };
  }

  public static async countInactive(): Promise<number> {
    const [row] = await db
      .select({ c: count() })
      .from(scoreSaberAccountsTable)
      .where(eq(scoreSaberAccountsTable.inactive, true));
    return row?.c ?? 0;
  }

  public static async countTotal(): Promise<number> {
    const [row] = await db.select({ c: count() }).from(scoreSaberAccountsTable);
    return row?.c ?? 0;
  }

  public static async countJoinedSince(date: Date): Promise<number> {
    const [row] = await db
      .select({ c: count() })
      .from(scoreSaberAccountsTable)
      .where(gte(scoreSaberAccountsTable.joinedDate, date));
    return row?.c ?? 0;
  }

  public static async selectAllIds(): Promise<{ id: string }[]> {
    return db.select({ id: scoreSaberAccountsTable.id }).from(scoreSaberAccountsTable);
  }

  public static async selectIdAndMedalsByIds(
    ids: string[]
  ): Promise<{ id: string; medals: number | null }[]> {
    if (ids.length === 0) return [];
    return db
      .select({ id: scoreSaberAccountsTable.id, medals: scoreSaberAccountsTable.medals })
      .from(scoreSaberAccountsTable)
      .where(inArray(scoreSaberAccountsTable.id, ids));
  }

  /**
   * Sets every account's `medals` from `SUM(scores.medals)` (single bulk pass + rank refresh caller).
   */
  public static async syncGlobalMedalTotalsFromScoresTable(): Promise<void> {
    await db.transaction(async tx => {
      await tx
        .update(scoreSaberAccountsTable)
        .set({ medals: 0 })
        .where(gt(scoreSaberAccountsTable.medals, 0));

      await tx.execute(sql`
        UPDATE "scoresaber-accounts" AS a
        SET medals = sub.total
        FROM (
          SELECT "playerId", SUM(medals)::int AS total
          FROM "scoresaber-scores"
          GROUP BY "playerId"
        ) AS sub
        WHERE a.id = sub."playerId"
      `);
    });
  }

  public static async getMedalsForPlayerId(playerId: string): Promise<number> {
    const [row] = await db
      .select({ medals: scoreSaberAccountsTable.medals })
      .from(scoreSaberAccountsTable)
      .where(eq(scoreSaberAccountsTable.id, playerId));
    return row?.medals ?? 0;
  }

  public static async setMedalsForPlayerIds(
    totalsByPlayer: Map<string, number>,
    playerIds: string[]
  ): Promise<void> {
    if (playerIds.length === 0) {
      return;
    }

    await db.transaction(async tx => {
      for (let i = 0; i < playerIds.length; i += MEDALS_BULK_UPDATE_CHUNK) {
        const chunk = playerIds.slice(i, i + MEDALS_BULK_UPDATE_CHUNK);
        const valueRows = chunk.map(pid => sql`(${pid}::varchar(32), ${totalsByPlayer.get(pid) ?? 0}::int)`);
        await tx.execute(sql`
          UPDATE "scoresaber-accounts" AS a
          SET medals = v.medals
          FROM (VALUES ${sql.join(valueRows, sql`, `)}) AS v(id, medals)
          WHERE a.id = v.id
        `);
      }
    });
  }

  /**
   * Recomputes materialized global and per-country medal ranks from current `medals` and `country`.
   * Rows not in the medals pool (`medals <= 0` or missing/empty `country`) get rank `0`.
   */
  public static async refreshMaterializedMedalRanks(): Promise<void> {
    await db.transaction(async tx => {
      await tx.execute(sql`
        UPDATE "scoresaber-accounts"
        SET "medalsRank" = 0, "medalsCountryRank" = 0
      `);
      await tx.execute(sql`
        UPDATE "scoresaber-accounts" AS a
        SET "medalsRank" = r.rank
        FROM (
          SELECT id, ROW_NUMBER() OVER (ORDER BY medals DESC, id ASC)::int AS rank
          FROM "scoresaber-accounts"
          WHERE medals > 0 AND country IS NOT NULL AND country != ''
        ) AS r
        WHERE a.id = r.id
      `);
      await tx.execute(sql`
        UPDATE "scoresaber-accounts" AS a
        SET "medalsCountryRank" = r.rank
        FROM (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY country ORDER BY medals DESC, id ASC)::int AS rank
          FROM "scoresaber-accounts"
          WHERE medals > 0 AND country IS NOT NULL AND country != ''
        ) AS r
        WHERE a.id = r.id
      `);
    });
  }

  public static async selectMedalRanksByIds(
    ids: string[]
  ): Promise<{ id: string; medalsRank: number; medalsCountryRank: number }[]> {
    if (ids.length === 0) return [];
    return db
      .select({
        id: scoreSaberAccountsTable.id,
        medalsRank: scoreSaberAccountsTable.medalsRank,
        medalsCountryRank: scoreSaberAccountsTable.medalsCountryRank,
      })
      .from(scoreSaberAccountsTable)
      .where(inArray(scoreSaberAccountsTable.id, ids));
  }

  private static medalRankingBaseWhere(country?: string) {
    return sql`
      medals > 0
      AND country IS NOT NULL
      AND country != ''
      ${country ? sql`AND country = ${country}` : sql``}
    `;
  }

  public static async countMedalRankingEligible(country?: string): Promise<number> {
    const baseWhere = ScoreSaberAccountsRepository.medalRankingBaseWhere(country);
    const [row] = await db.select({ totalPlayers: count() }).from(scoreSaberAccountsTable).where(baseWhere);
    return row?.totalPlayers ?? 0;
  }

  public static async selectMedalRankingCountryMetadata(
    country?: string
  ): Promise<{ country: string | null; count: number }[]> {
    const baseWhere = ScoreSaberAccountsRepository.medalRankingBaseWhere(country);
    return db
      .select({ country: scoreSaberAccountsTable.country, count: count() })
      .from(scoreSaberAccountsTable)
      .where(
        and(baseWhere, isNotNull(scoreSaberAccountsTable.country), ne(scoreSaberAccountsTable.country, ""))
      )
      .groupBy(scoreSaberAccountsTable.country)
      .orderBy(desc(count()));
  }

  public static async selectMedalRankingPage(
    country: string | undefined,
    offset: number,
    limit: number
  ): Promise<{ id: string; medals: number; country: string | null }[]> {
    const baseWhere = ScoreSaberAccountsRepository.medalRankingBaseWhere(country);
    return db
      .select({
        id: scoreSaberAccountsTable.id,
        medals: scoreSaberAccountsTable.medals,
        country: scoreSaberAccountsTable.country,
      })
      .from(scoreSaberAccountsTable)
      .where(baseWhere)
      .orderBy(desc(scoreSaberAccountsTable.medals), asc(scoreSaberAccountsTable.id))
      .limit(limit)
      .offset(offset);
  }
}
