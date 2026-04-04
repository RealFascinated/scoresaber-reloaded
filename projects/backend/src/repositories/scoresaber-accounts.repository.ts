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

export type ScoreSaberAccountInsert = typeof scoreSaberAccountsTable.$inferInsert;

export class ScoreSaberAccountsRepository {
  public static async findRowById(id: string): Promise<ScoreSaberAccountRow | undefined> {
    const [row] = await db
      .select()
      .from(scoreSaberAccountsTable)
      .where(eq(scoreSaberAccountsTable.id, id))
      .limit(1);
    return row;
  }

  public static async insert(row: ScoreSaberAccountInsert): Promise<ScoreSaberAccountRow[]> {
    return db
      .insert(scoreSaberAccountsTable)
      .values(row)
      .onConflictDoNothing({
        target: scoreSaberAccountsTable.id,
      })
      .returning();
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

  public static async syncGlobalMedalTotalsFromMap(playerMedalCounts: Map<string, number>): Promise<void> {
    await db.transaction(async tx => {
      await tx
        .update(scoreSaberAccountsTable)
        .set({ medals: 0 })
        .where(gt(scoreSaberAccountsTable.medals, 0));

      for (const [playerId, medalCount] of playerMedalCounts) {
        await tx
          .update(scoreSaberAccountsTable)
          .set({ medals: medalCount })
          .where(eq(scoreSaberAccountsTable.id, playerId));
      }
    });
  }

  public static async getMedalsForPlayerId(playerId: string): Promise<number> {
    const [row] = await db
      .select({ medals: scoreSaberAccountsTable.medals })
      .from(scoreSaberAccountsTable)
      .where(eq(scoreSaberAccountsTable.id, playerId))
      .limit(1);
    return row?.medals ?? 0;
  }

  public static async setMedalsForPlayerIds(
    totalsByPlayer: Map<string, number>,
    playerIds: string[]
  ): Promise<void> {
    await db.transaction(async tx => {
      for (const playerId of playerIds) {
        await tx
          .update(scoreSaberAccountsTable)
          .set({ medals: totalsByPlayer.get(playerId) ?? 0 })
          .where(eq(scoreSaberAccountsTable.id, playerId));
      }
    });
  }

  private static medalRankingBaseWhere(country?: string) {
    return sql`
      medals > 0
      AND country IS NOT NULL
      AND country != ''
      ${country ? sql`AND country = ${country}` : sql``}
    `;
  }

  public static async getMedalRanksForIds(
    playerIds: string[],
    options: { country?: string; partitionByCountry?: boolean }
  ): Promise<Map<string, number>> {
    if (playerIds.length === 0) return new Map();

    const { country, partitionByCountry } = options;
    const partitionClause = partitionByCountry ? sql`PARTITION BY country` : sql``;
    const countryFilter = country ? sql`AND country = ${country}` : sql``;

    const result = await db.execute(sql`
      WITH ranked AS (
        SELECT id, ROW_NUMBER() OVER (${partitionClause} ORDER BY medals DESC, id ASC) AS rank
        FROM "scoresaber-accounts"
        WHERE medals > 0
          AND country IS NOT NULL
          AND country != ''
          ${countryFilter}
      )
      SELECT id, rank::int AS rank FROM ranked
      WHERE id IN (${sql.join(
        playerIds.map(id => sql`${id}`),
        sql`, `
      )})
    `);

    const rows = (result as unknown as { rows: { id: string; rank: number }[] }).rows ?? [];
    return new Map(rows.map(r => [r.id, Number(r.rank)]));
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

  public static async getPlayerGlobalMedalRank(playerId: string): Promise<number | null> {
    const result = await db.execute<{ rank: number }>(sql`
      SELECT rank::int FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY medals DESC, id ASC) AS rank
        FROM "scoresaber-accounts"
        WHERE medals > 0 AND country IS NOT NULL AND country != ''
      ) ranked
      WHERE id = ${playerId}
    `);
    return result.rows[0]?.rank ?? null;
  }

  public static async getPlayerCountryMedalRank(playerId: string): Promise<number | null> {
    const result = await db.execute<{ rank: number }>(sql`
      SELECT rank::int FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY country ORDER BY medals DESC, id ASC) AS rank
        FROM "scoresaber-accounts"
        WHERE medals > 0 AND country IS NOT NULL AND country != ''
      ) ranked
      WHERE id = ${playerId}
    `);
    return result.rows[0]?.rank ?? null;
  }
}
