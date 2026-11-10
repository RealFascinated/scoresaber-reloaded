import { MapCharacteristic } from "@ssr/common/schemas/map/map-characteristic";
import { MapDifficulty } from "@ssr/common/schemas/map/map-difficulty";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import type {
  ScoreSaberLeaderboardQueryCategory,
  ScoreSaberLeaderboardQueryFilters,
} from "@ssr/common/schemas/scoresaber/leaderboard/query-filters";
import type { AnyColumn, SQL } from "drizzle-orm";
import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { normalizeSongHash } from "../common/cache-keys";
import { db } from "../db";
import { leaderboardRowToType } from "../db/converter/scoresaber-leaderboard";
import {
  ScoreSaberLeaderboardBaseRow,
  ScoreSaberLeaderboardRow,
  scoreSaberLeaderboardRealmsTable,
  scoreSaberLeaderboardsTable,
} from "../db/schema";
import { leaderboardRealmJoinOn, resolvedLeaderboardColumns } from "./realm-columns";
import { TableCountsRepository } from "./table-counts.repository";

export const LEADERBOARD_SEARCH_PAGE_SIZE = 20;

/** Anything exposing the leaderboards full-text search column: the table itself or an alias of it. */
type SearchVectorSource = { searchVector: AnyColumn };

type LeaderboardAlias = ReturnType<typeof alias<typeof scoreSaberLeaderboardsTable, string>>;
type LeaderboardRealmAlias = ReturnType<typeof alias<typeof scoreSaberLeaderboardRealmsTable, string>>;

type DifficultyRow = {
  id: number;
  stars: number;
  difficulty: ScoreSaberLeaderboardRow["difficulty"];
  characteristic: ScoreSaberLeaderboardRow["characteristic"];
};

type JoinedRow = {
  leaderboard: ScoreSaberLeaderboardRow;
  difficulties: DifficultyRow | null;
};

function mergeJoinedRows(rows: JoinedRow[]): ScoreSaberLeaderboard[] {
  const acc = new Map<number, { main: ScoreSaberLeaderboardRow; difficulties: Map<number, DifficultyRow> }>();
  const order: number[] = [];

  for (const { leaderboard, difficulties } of rows) {
    if (!acc.has(leaderboard.id)) {
      order.push(leaderboard.id);
      acc.set(leaderboard.id, { main: leaderboard, difficulties: new Map() });
    }
    if (difficulties) {
      acc.get(leaderboard.id)!.difficulties.set(difficulties.id, difficulties);
    }
  }

  return order.map(id => {
    const { main, difficulties } = acc.get(id)!;
    return leaderboardRowToType(main, difficulties.size > 0 ? [...difficulties.values()] : []);
  });
}

const difficultySortSql = (tableAlias: LeaderboardAlias) =>
  sql`CASE ${tableAlias.difficulty}
    WHEN 'Easy' THEN 1
    WHEN 'Normal' THEN 2
    WHEN 'Hard' THEN 3
    WHEN 'Expert' THEN 4
    WHEN 'ExpertPlus' THEN 5
    ELSE 999
  END`;

/**
 * Selects a leaderboard (aliased as `mainAlias`) with its sibling difficulties, both resolved for `realmId`.
 * Rows repeat per difficulty and are folded together by {@link mergeJoinedRows}.
 */
function selectWithDifficulties(
  mainAlias: LeaderboardAlias,
  realmId: number,
  where: SQL | undefined,
  extraOrder: SQL[] = []
): Promise<JoinedRow[]> {
  const difficultiesAlias = alias(scoreSaberLeaderboardsTable, "difficulties");
  const mainRealmAlias: LeaderboardRealmAlias = alias(scoreSaberLeaderboardRealmsTable, "main_realm");
  const difficultiesRealmAlias: LeaderboardRealmAlias = alias(
    scoreSaberLeaderboardRealmsTable,
    "difficulties_realm"
  );

  return db
    .select({
      leaderboard: resolvedLeaderboardColumns(mainAlias, mainRealmAlias),
      difficulties: {
        id: difficultiesAlias.id,
        stars: sql<number>`coalesce(${difficultiesRealmAlias.stars}, 0)`.mapWith(Number),
        difficulty: difficultiesAlias.difficulty,
        characteristic: difficultiesAlias.characteristic,
      },
    })
    .from(mainAlias)
    .leftJoin(mainRealmAlias, leaderboardRealmJoinOn(mainAlias, mainRealmAlias, realmId))
    .leftJoin(difficultiesAlias, eq(mainAlias.songHash, difficultiesAlias.songHash))
    .leftJoin(
      difficultiesRealmAlias,
      leaderboardRealmJoinOn(difficultiesAlias, difficultiesRealmAlias, realmId)
    )
    .where(where)
    .orderBy(...extraOrder, asc(difficultySortSql(difficultiesAlias)));
}

export function aliasFtsMatch(tableAlias: SearchVectorSource, search: string): SQL {
  return sql`${tableAlias.searchVector} @@ plainto_tsquery('english', ${search})`;
}

export function aliasTsRankExpr(tableAlias: SearchVectorSource, search: string): SQL {
  return sql`ts_rank(${tableAlias.searchVector}, plainto_tsquery('english', ${search}))`;
}

/**
 * Table sort for leaderboard search / playlists: one primary column (+ optional date fallback) and id tie-break.
 */
export function leaderboardSearchCategoryOrderBy(
  category: ScoreSaberLeaderboardQueryCategory,
  ascending: boolean
): SQL[] {
  const idTie = ascending ? asc(scoreSaberLeaderboardsTable.id) : desc(scoreSaberLeaderboardsTable.id);
  const starsCol = sql`coalesce(${scoreSaberLeaderboardRealmsTable.stars}, 0)`;

  switch (category) {
    case "plays":
      return ascending
        ? [sql`${scoreSaberLeaderboardsTable.plays} ASC NULLS LAST`, idTie]
        : [sql`${scoreSaberLeaderboardsTable.plays} DESC NULLS LAST`, idTie];
    case "daily_plays":
      return ascending
        ? [sql`${scoreSaberLeaderboardsTable.dailyPlays} ASC NULLS LAST`, idTie]
        : [sql`${scoreSaberLeaderboardsTable.dailyPlays} DESC NULLS LAST`, idTie];
    case "star_difficulty":
      return ascending ? [sql`${starsCol} ASC NULLS LAST`, idTie] : [sql`${starsCol} DESC NULLS LAST`, idTie];
    case "date_ranked":
      return ascending
        ? [sql`${scoreSaberLeaderboardRealmsTable.rankedDate} ASC NULLS LAST`, idTie]
        : [sql`${scoreSaberLeaderboardRealmsTable.rankedDate} DESC NULLS LAST`, idTie];
    case "date_created":
      return ascending
        ? [sql`${scoreSaberLeaderboardsTable.timestamp} ASC NULLS LAST`, idTie]
        : [sql`${scoreSaberLeaderboardsTable.timestamp} DESC NULLS LAST`, idTie];
    case "trending":
      return ascending
        ? [sql`${scoreSaberLeaderboardsTable.trendingScore} ASC NULLS LAST`, idTie]
        : [sql`${scoreSaberLeaderboardsTable.trendingScore} DESC NULLS LAST`, idTie];
  }
}

/**
 * Builds the WHERE and ORDER BY clauses for a leaderboard query. The query must join
 * {@link scoreSaberLeaderboardRealmsTable} for the realm being queried (see
 * {@link ScoreSaberLeaderboardsRepository.selectResolved}); ranking filters and sorts read from it.
 *
 * @param filters the filters to apply
 * @returns the WHERE and ORDER BY clauses for a leaderboard query
 */
export function buildLeaderboardQuery(filters?: ScoreSaberLeaderboardQueryFilters): {
  whereClause: SQL | undefined;
  orderParts: SQL[];
} {
  const conditions: SQL[] = [];
  if (filters?.ranked === true) {
    conditions.push(eq(scoreSaberLeaderboardRealmsTable.ranked, true));
  }
  if (filters?.qualified === true) {
    conditions.push(eq(scoreSaberLeaderboardRealmsTable.qualified, true));
  }
  if (filters?.minStars) {
    conditions.push(gte(sql`coalesce(${scoreSaberLeaderboardRealmsTable.stars}, 0)`, filters.minStars));
  }
  if (filters?.maxStars) {
    conditions.push(lte(sql`coalesce(${scoreSaberLeaderboardRealmsTable.stars}, 0)`, filters.maxStars));
  }

  const searchTrimmed = filters?.query?.trim() ?? "";
  const useFts = searchTrimmed.length >= 3;
  if (useFts) {
    conditions.push(aliasFtsMatch(scoreSaberLeaderboardsTable, searchTrimmed));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const category = filters?.category ?? "date_ranked";
  const ascending = (filters?.sort ?? "desc") === "asc";
  const idTie = ascending ? asc(scoreSaberLeaderboardsTable.id) : desc(scoreSaberLeaderboardsTable.id);

  const orderParts = (() => {
    if (useFts) {
      const rank = aliasTsRankExpr(scoreSaberLeaderboardsTable, searchTrimmed);
      return ascending ? [asc(rank), idTie] : [desc(rank), idTie];
    }
    return leaderboardSearchCategoryOrderBy(category, ascending);
  })();

  return { whereClause, orderParts };
}

export class ScoreSaberLeaderboardsRepository {
  /**
   * Starts a select of leaderboard rows resolved for `realmId` (the realm table is left-joined, so
   * unranked leaderboards are included with 0 stars). Filters and sorts built by
   * {@link buildLeaderboardQuery} can be applied directly to the result.
   */
  public static selectResolved(realmId: number) {
    return db
      .select(resolvedLeaderboardColumns())
      .from(scoreSaberLeaderboardsTable)
      .leftJoin(
        scoreSaberLeaderboardRealmsTable,
        leaderboardRealmJoinOn(scoreSaberLeaderboardsTable, scoreSaberLeaderboardRealmsTable, realmId)
      );
  }

  /**
   * All matching leaderboards (no limit) using the same filter/sort semantics as paginated search.
   */
  public static async getLeaderboards(
    filters: ScoreSaberLeaderboardQueryFilters | undefined,
    realmId: number
  ): Promise<ScoreSaberLeaderboard[]> {
    const { whereClause, orderParts } = buildLeaderboardQuery(filters);
    const rows = await ScoreSaberLeaderboardsRepository.selectResolved(realmId)
      .where(whereClause)
      .orderBy(...orderParts);
    return rows.map(row => leaderboardRowToType(row));
  }

  public static async getLeaderboardByHash(
    hash: string,
    difficulty: MapDifficulty,
    characteristic: MapCharacteristic,
    includeDifficulties: boolean = true,
    realmId: number
  ): Promise<ScoreSaberLeaderboard | undefined> {
    const hashNorm = normalizeSongHash(hash);
    const mainAlias = alias(scoreSaberLeaderboardsTable, "leaderboard");
    const where = and(
      eq(sql`lower(${mainAlias.songHash})`, hashNorm),
      eq(mainAlias.difficulty, difficulty),
      eq(mainAlias.characteristic, characteristic)
    );

    if (includeDifficulties) {
      const rows = await selectWithDifficulties(mainAlias, realmId, where);
      return mergeJoinedRows(rows)[0];
    }

    const rows = await ScoreSaberLeaderboardsRepository.selectResolved(realmId)
      .where(
        and(
          eq(sql`lower(${scoreSaberLeaderboardsTable.songHash})`, hashNorm),
          eq(scoreSaberLeaderboardsTable.difficulty, difficulty),
          eq(scoreSaberLeaderboardsTable.characteristic, characteristic)
        )
      )
      .limit(1);
    return rows[0] ? leaderboardRowToType(rows[0]) : undefined;
  }

  public static async existsById(id: number): Promise<boolean> {
    const rows = await db
      .select({ exists: sql`1` })
      .from(scoreSaberLeaderboardsTable)
      .where(eq(scoreSaberLeaderboardsTable.id, id));
    return rows.length > 0;
  }

  public static async getLeaderboardById(
    id: number,
    includeDifficulties: boolean = true,
    realmId: number
  ): Promise<ScoreSaberLeaderboard | undefined> {
    const mainAlias = alias(scoreSaberLeaderboardsTable, "leaderboard");

    if (includeDifficulties) {
      const rows = await selectWithDifficulties(mainAlias, realmId, eq(mainAlias.id, id));
      return mergeJoinedRows(rows)[0];
    }

    const rows = await ScoreSaberLeaderboardsRepository.selectResolved(realmId).where(
      eq(scoreSaberLeaderboardsTable.id, id)
    );
    return rows[0] ? leaderboardRowToType(rows[0]) : undefined;
  }

  public static async searchLeaderboardIds(search: string, limit: number = 50): Promise<number[]> {
    if (search.length < 3) {
      return [];
    }

    const mainAlias = alias(scoreSaberLeaderboardsTable, "leaderboard");
    const result = await db
      .select({ id: mainAlias.id })
      .from(mainAlias)
      .where(aliasFtsMatch(mainAlias, search))
      .orderBy(desc(aliasTsRankExpr(mainAlias, search)))
      .limit(limit);

    return result.map(row => row.id);
  }

  public static async getLeaderboardsByIds(
    ids: number[],
    includeDifficulties: boolean = true,
    realmId: number
  ): Promise<ScoreSaberLeaderboard[]> {
    const mainAlias = alias(scoreSaberLeaderboardsTable, "leaderboard");

    if (includeDifficulties) {
      const rows = await selectWithDifficulties(mainAlias, realmId, inArray(mainAlias.id, ids), [
        asc(mainAlias.id),
      ]);
      return mergeJoinedRows(rows);
    }

    const rows = await ScoreSaberLeaderboardsRepository.selectResolved(realmId).where(
      inArray(scoreSaberLeaderboardsTable.id, ids)
    );
    return rows.map(row => leaderboardRowToType(row));
  }

  public static getRankedLeaderboards(realmId: number): Promise<ScoreSaberLeaderboard[]> {
    return ScoreSaberLeaderboardsRepository.getLeaderboards({ ranked: true }, realmId);
  }

  public static getQualifiedLeaderboards(realmId: number): Promise<ScoreSaberLeaderboard[]> {
    return ScoreSaberLeaderboardsRepository.getLeaderboards({ qualified: true }, realmId);
  }

  public static async getTopTrendingLeaderboards(
    limit: number = 100,
    realmId: number
  ): Promise<ScoreSaberLeaderboard[]> {
    const rows = await ScoreSaberLeaderboardsRepository.selectResolved(realmId)
      .orderBy(...leaderboardSearchCategoryOrderBy("trending", false))
      .limit(limit);

    return rows.map(row => leaderboardRowToType(row));
  }

  /**
   * Writes a leaderboard's ranking state for one realm. The table is sparse, so a leaderboard that
   * is neither ranked nor qualified has its row removed instead.
   */
  public static async writeRealmState(
    leaderboards: Pick<
      ScoreSaberLeaderboard,
      "id" | "ranked" | "qualified" | "stars" | "rankedDate" | "qualifiedDate"
    >[],
    realmId: number,
    executor: Pick<typeof db, "insert" | "delete"> = db
  ): Promise<void> {
    const active = leaderboards.filter(lb => lb.ranked || lb.qualified);
    const inactive = leaderboards.filter(lb => !lb.ranked && !lb.qualified);

    if (inactive.length > 0) {
      await executor.delete(scoreSaberLeaderboardRealmsTable).where(
        and(
          eq(scoreSaberLeaderboardRealmsTable.realmId, realmId),
          inArray(
            scoreSaberLeaderboardRealmsTable.leaderboardId,
            inactive.map(lb => lb.id)
          )
        )
      );
    }

    if (active.length > 0) {
      await executor
        .insert(scoreSaberLeaderboardRealmsTable)
        .values(
          active.map(lb => ({
            leaderboardId: lb.id,
            realmId,
            ranked: lb.ranked,
            qualified: lb.qualified,
            stars: lb.stars,
            rankedDate: lb.rankedDate ?? null,
            qualifiedDate: lb.qualifiedDate ?? null,
          }))
        )
        .onConflictDoUpdate({
          target: [scoreSaberLeaderboardRealmsTable.leaderboardId, scoreSaberLeaderboardRealmsTable.realmId],
          set: {
            ranked: sql`excluded."ranked"`,
            qualified: sql`excluded."qualified"`,
            stars: sql`excluded."stars"`,
            rankedDate: sql`excluded."rankedDate"`,
            qualifiedDate: sql`excluded."qualifiedDate"`,
          },
          // Skip rewriting rows that already hold these values, so a re-sync of unchanged state
          // doesn't produce dead tuples and index churn.
          setWhere: sql`(
            ${scoreSaberLeaderboardRealmsTable.ranked},
            ${scoreSaberLeaderboardRealmsTable.qualified},
            ${scoreSaberLeaderboardRealmsTable.stars},
            ${scoreSaberLeaderboardRealmsTable.rankedDate},
            ${scoreSaberLeaderboardRealmsTable.qualifiedDate}
          ) IS DISTINCT FROM (
            excluded."ranked", excluded."qualified", excluded."stars", excluded."rankedDate", excluded."qualifiedDate"
          )`,
        });
    }
  }

  public static async insert(id: number, leaderboard: ScoreSaberLeaderboard, realmId: number): Promise<void> {
    await db.transaction(async tx => {
      const inserted = await tx
        .insert(scoreSaberLeaderboardsTable)
        .values({
          id,
          songHash: leaderboard.songHash,
          songName: leaderboard.songName,
          songSubName: leaderboard.songSubName,
          songAuthorName: leaderboard.songAuthorName,
          levelAuthorName: leaderboard.levelAuthorName,
          difficulty: leaderboard.difficulty.difficulty,
          characteristic: leaderboard.difficulty.characteristic,
          maxScore: leaderboard.maxScore,
          plays: leaderboard.plays,
          dailyPlays: leaderboard.dailyPlays,
          seededScores: false,
          timestamp: leaderboard.timestamp,
        })
        .onConflictDoNothing({ target: scoreSaberLeaderboardsTable.id })
        .returning({ id: scoreSaberLeaderboardsTable.id });

      if (inserted.length > 0) {
        await ScoreSaberLeaderboardsRepository.writeRealmState([{ ...leaderboard, id }], realmId, tx);
      }
    });
  }

  public static async updateLeaderboard(
    id: number,
    partial: Partial<ScoreSaberLeaderboardBaseRow>
  ): Promise<void> {
    await db.update(scoreSaberLeaderboardsTable).set(partial).where(eq(scoreSaberLeaderboardsTable.id, id));
  }

  /**
   * Records a play on a leaderboard: sets its play count and max score.
   *
   * @param id the leaderboard id
   * @param plays the new play count
   * @param maxScore the leaderboard's max score
   * @returns whether the leaderboard exists. A leaderboard that doesn't is left untouched, so the
   *  caller can create it without having to check for it first.
   */
  public static async updatePlaysAndMaxScore(id: number, plays: number, maxScore: number): Promise<boolean> {
    const rows = await db
      .update(scoreSaberLeaderboardsTable)
      .set({ plays, maxScore })
      .where(eq(scoreSaberLeaderboardsTable.id, id))
      .returning({ id: scoreSaberLeaderboardsTable.id });
    return rows.length > 0;
  }

  public static async upsertLeaderboards(
    leaderboards: ScoreSaberLeaderboard[],
    realmId: number
  ): Promise<void> {
    if (leaderboards.length === 0) {
      return;
    }

    const rows: ScoreSaberLeaderboardBaseRow[] = leaderboards.map(lb => ({
      id: lb.id,
      songHash: lb.songHash,
      songName: lb.songName,
      songSubName: lb.songSubName,
      songAuthorName: lb.songAuthorName,
      levelAuthorName: lb.levelAuthorName,
      difficulty: lb.difficulty.difficulty,
      characteristic: lb.difficulty.characteristic,
      maxScore: lb.maxScore,
      plays: lb.plays,
      dailyPlays: lb.dailyPlays,
      seededScores: false,
      trendingScore: 0,
      timestamp: lb.timestamp,
    }));

    await db.transaction(async tx => {
      await tx
        .insert(scoreSaberLeaderboardsTable)
        .values(rows)
        .onConflictDoUpdate({
          target: scoreSaberLeaderboardsTable.id,
          set: {
            songHash: sql`excluded."songHash"`,
            songName: sql`excluded."songName"`,
            songSubName: sql`excluded."songSubName"`,
            songAuthorName: sql`excluded."songAuthorName"`,
            levelAuthorName: sql`excluded."levelAuthorName"`,
            difficulty: sql`excluded."difficulty"`,
            characteristic: sql`excluded."characteristic"`,
            maxScore: sql`excluded."maxScore"`,
            plays: sql`excluded."plays"`,
            dailyPlays: sql`excluded."dailyPlays"`,
            timestamp: sql`excluded."timestamp"`,
            seededScores: sql`${scoreSaberLeaderboardsTable.seededScores}`,
          },
          // Leaderboard rows carry several descending indexes (plays, timestamp), so skip the
          // rewrite when nothing about the row changed.
          setWhere: sql`(
            ${scoreSaberLeaderboardsTable.songHash},
            ${scoreSaberLeaderboardsTable.songName},
            ${scoreSaberLeaderboardsTable.songSubName},
            ${scoreSaberLeaderboardsTable.songAuthorName},
            ${scoreSaberLeaderboardsTable.levelAuthorName},
            ${scoreSaberLeaderboardsTable.difficulty},
            ${scoreSaberLeaderboardsTable.characteristic},
            ${scoreSaberLeaderboardsTable.maxScore},
            ${scoreSaberLeaderboardsTable.plays},
            ${scoreSaberLeaderboardsTable.dailyPlays},
            ${scoreSaberLeaderboardsTable.timestamp}
          ) IS DISTINCT FROM (
            excluded."songHash", excluded."songName", excluded."songSubName", excluded."songAuthorName",
            excluded."levelAuthorName", excluded."difficulty", excluded."characteristic", excluded."maxScore",
            excluded."plays", excluded."dailyPlays", excluded."timestamp"
          )`,
        });

      await ScoreSaberLeaderboardsRepository.writeRealmState(leaderboards, realmId, tx);
    });
  }

  public static async countTotal(): Promise<number> {
    const counts = await TableCountsRepository.getCounts();
    return counts.scoresaberLeaderboards;
  }
}
