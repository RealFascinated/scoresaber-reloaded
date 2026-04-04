import { MapCategory, MapSort, StarFilter } from "@ssr/common/maps/types";
import type { Page } from "@ssr/common/pagination";
import { MapCharacteristic } from "@ssr/common/schemas/map/map-characteristic";
import { MapDifficulty } from "@ssr/common/schemas/map/map-difficulty";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import type { SQL } from "drizzle-orm";
import { and, asc, count, desc, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../db";
import { leaderboardRowToType, mergeJoinedLeaderboardRows } from "../db/converter/scoresaber-leaderboard";
import { ScoreSaberLeaderboardRow, scoreSaberLeaderboardsTable } from "../db/schema";

const LEADERBOARD_SEARCH_PAGE_SIZE = 20;

type LeaderboardFilters = {
  ranked?: boolean;
  qualified?: boolean;
  minStars?: number;
  maxStars?: number;
  includeDifficulties?: boolean;
};

// Type helper for the aliased table to avoid 'any'
type LeaderboardAlias = ReturnType<typeof alias<typeof scoreSaberLeaderboardsTable, string>>;

/**
 * Helper to provide consistent difficulty ordering: 
 * Easy (1) -> ExpertPlus (5)
 */
const difficultySortSql = (tableAlias: LeaderboardAlias) =>
  sql`CASE ${tableAlias.difficulty}
    WHEN 'Easy' THEN 1
    WHEN 'Normal' THEN 2
    WHEN 'Hard' THEN 3
    WHEN 'Expert' THEN 4
    WHEN 'ExpertPlus' THEN 5
    ELSE 999
  END`;

function aliasFtsMatch(tableAlias: LeaderboardAlias, search: string): SQL {
  return sql`to_tsvector('english', ${tableAlias.songName} || ' ' || ${tableAlias.songSubName} || ' ' || ${tableAlias.songAuthorName} || ' ' || ${tableAlias.levelAuthorName}) @@ plainto_tsquery('english', ${search})`;
}

function aliasTsRankExpr(tableAlias: LeaderboardAlias, search: string): SQL {
  return sql`ts_rank(to_tsvector('english', ${tableAlias.songName} || ' ' || ${tableAlias.songSubName} || ' ' || ${tableAlias.songAuthorName} || ' ' || ${tableAlias.levelAuthorName}), plainto_tsquery('english', ${search}))`;
}

export class ScoreSaberLeaderboardsRepository {
  private static async fetchLeaderboards(
    filters: LeaderboardFilters,
    orderBy?: SQL[]
  ): Promise<ScoreSaberLeaderboard[]> {
    const { ranked, qualified, minStars, maxStars, includeDifficulties = true } = filters;
    const mainAlias = alias(scoreSaberLeaderboardsTable, "leaderboard");

    const conditions: SQL[] = [];
    if (ranked !== undefined) conditions.push(eq(mainAlias.ranked, ranked));
    if (qualified !== undefined) conditions.push(eq(mainAlias.qualified, qualified));
    if (minStars !== undefined || maxStars !== undefined) conditions.push(isNotNull(mainAlias.stars));
    if (minStars !== undefined) conditions.push(gte(mainAlias.stars, minStars));
    if (maxStars !== undefined) conditions.push(lte(mainAlias.stars, maxStars));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    if (includeDifficulties) {
      const difficultiesAlias = alias(scoreSaberLeaderboardsTable, "difficulties");
      const query = db
        .select()
        .from(mainAlias)
        .leftJoin(difficultiesAlias, eq(mainAlias.songHash, difficultiesAlias.songHash))
        .where(where);

      const finalOrderBy = orderBy ? [...orderBy] : [asc(mainAlias.id)];
      // Apply your requested difficulty sort
      finalOrderBy.push(asc(difficultySortSql(difficultiesAlias)));

      return mergeJoinedLeaderboardRows(await query.orderBy(...finalOrderBy));
    }

    const query = db.select().from(mainAlias).where(where);
    if (orderBy?.length) query.orderBy(...orderBy);
    return (await query).map(row => leaderboardRowToType(row));
  }

  public static async getLeaderboardByHash(
    hashNorm: string,
    difficulty: MapDifficulty,
    characteristic: MapCharacteristic,
    includeDifficulties: boolean = true
  ): Promise<ScoreSaberLeaderboard | undefined> {
    const mainAlias = alias(scoreSaberLeaderboardsTable, "leaderboard");
    const where = and(
      eq(sql`lower(${mainAlias.songHash})`, hashNorm),
      eq(mainAlias.difficulty, difficulty),
      eq(mainAlias.characteristic, characteristic)
    );

    if (includeDifficulties) {
      const difficultiesAlias = alias(scoreSaberLeaderboardsTable, "difficulties");
      const rows = await db
        .select()
        .from(mainAlias)
        .leftJoin(difficultiesAlias, eq(mainAlias.songHash, difficultiesAlias.songHash))
        .where(where)
        .orderBy(asc(mainAlias.id), asc(difficultySortSql(difficultiesAlias)));
      return mergeJoinedLeaderboardRows(rows)[0];
    }

    const rows = await db.select().from(mainAlias).where(where).limit(1);
    return rows[0] ? leaderboardRowToType(rows[0]) : undefined;
  }

  public static async existsById(id: number): Promise<boolean> {
    const rows = await db
      .select({ exists: sql`1` })
      .from(scoreSaberLeaderboardsTable)
      .where(eq(scoreSaberLeaderboardsTable.id, id))
      .limit(1);
    return rows.length > 0;
  }

  public static async getLeaderboardById(
    id: number,
    includeDifficulties: boolean = true
  ): Promise<ScoreSaberLeaderboard | undefined> {
    const mainAlias = alias(scoreSaberLeaderboardsTable, "leaderboard");

    if (includeDifficulties) {
      const difficultiesAlias = alias(scoreSaberLeaderboardsTable, "difficulties");
      const rows = await db
        .select()
        .from(mainAlias)
        .leftJoin(difficultiesAlias, eq(mainAlias.songHash, difficultiesAlias.songHash))
        .where(eq(mainAlias.id, id))
        .orderBy(asc(mainAlias.id), asc(difficultySortSql(difficultiesAlias)));
      return mergeJoinedLeaderboardRows(rows)[0];
    }

    const rows = await db.select().from(mainAlias).where(eq(mainAlias.id, id)).limit(1);
    return rows[0] ? leaderboardRowToType(rows[0]) : undefined;
  }

  public static async searchLeaderboardIds(search: string, limit: number = 50): Promise<number[]> {
    if (search.length < 3) return [];

    const mainAlias = alias(scoreSaberLeaderboardsTable, "leaderboard");
    const result = await db
      .select({ id: mainAlias.id })
      .from(mainAlias)
      .where(aliasFtsMatch(mainAlias, search))
      .orderBy(desc(aliasTsRankExpr(mainAlias, search)))
      .limit(limit);

    return result.map(row => row.id);
  }

  public static async getLeaderboardsByIds(ids: number[], includeDifficulties: boolean = true): Promise<ScoreSaberLeaderboard[]> {
    const mainAlias = alias(scoreSaberLeaderboardsTable, "leaderboard");

    if (includeDifficulties) {
      const difficultiesAlias = alias(scoreSaberLeaderboardsTable, "difficulties");
      const rows = await db
        .select()
        .from(mainAlias)
        .leftJoin(difficultiesAlias, eq(mainAlias.songHash, difficultiesAlias.songHash))
        .where(inArray(mainAlias.id, ids))
        .orderBy(asc(mainAlias.id), asc(difficultySortSql(difficultiesAlias)));
      return mergeJoinedLeaderboardRows(rows);
    }

    const rows = await db.select().from(mainAlias).where(inArray(mainAlias.id, ids));
    return rows.map(row => leaderboardRowToType(row));
  }

  public static getRankedLeaderboards(includeDifficulties = true): Promise<ScoreSaberLeaderboard[]> {
    return ScoreSaberLeaderboardsRepository.fetchLeaderboards({ ranked: true, includeDifficulties });
  }

  public static getQualifiedLeaderboards(includeDifficulties = true): Promise<ScoreSaberLeaderboard[]> {
    return ScoreSaberLeaderboardsRepository.fetchLeaderboards({ qualified: true, includeDifficulties });
  }

  public static getRankedLeaderboardsByStarsBetween(
    minStars: number,
    maxStars: number,
    includeDifficulties = true
  ): Promise<ScoreSaberLeaderboard[]> {
    return ScoreSaberLeaderboardsRepository.fetchLeaderboards(
      { ranked: true, minStars, maxStars, includeDifficulties },
      [asc(scoreSaberLeaderboardsTable.stars)]
    );
  }

  public static async insert(
    id: number,
    leaderboard: ScoreSaberLeaderboard,
    cachedSongArt: boolean
  ): Promise<void> {
    await db
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
        ranked: leaderboard.ranked,
        qualified: leaderboard.qualified,
        stars: leaderboard.stars,
        rankedDate: leaderboard.rankedDate,
        qualifiedDate: leaderboard.qualifiedDate,
        plays: leaderboard.plays,
        dailyPlays: leaderboard.dailyPlays,
        seededScores: false,
        cachedSongArt,
        timestamp: leaderboard.timestamp,
      })
      .onConflictDoNothing({ target: scoreSaberLeaderboardsTable.id });
  }

  public static async updateLeaderboardById(id: number, partial: Partial<ScoreSaberLeaderboardRow>): Promise<void> {
    await db.update(scoreSaberLeaderboardsTable).set(partial).where(eq(scoreSaberLeaderboardsTable.id, id));
  }

  public static async upsertLeaderboards(leaderboards: ScoreSaberLeaderboard[]): Promise<void> {
    if (leaderboards.length === 0) return;

    const t = scoreSaberLeaderboardsTable;
    const rows: ScoreSaberLeaderboardRow[] = leaderboards.map(lb => ({
      id: lb.id,
      songHash: lb.songHash,
      songName: lb.songName,
      songSubName: lb.songSubName,
      songAuthorName: lb.songAuthorName,
      levelAuthorName: lb.levelAuthorName,
      difficulty: lb.difficulty.difficulty,
      characteristic: lb.difficulty.characteristic,
      maxScore: lb.maxScore,
      ranked: lb.ranked,
      qualified: lb.qualified,
      stars: lb.stars,
      rankedDate: lb.rankedDate ?? null,
      qualifiedDate: lb.qualifiedDate ?? null,
      plays: lb.plays,
      dailyPlays: lb.dailyPlays,
      seededScores: false,
      cachedSongArt: false,
      timestamp: lb.timestamp,
    }));

    await db
      .insert(t)
      .values(rows)
      .onConflictDoUpdate({
        target: t.id,
        set: {
          songHash: sql`excluded."songHash"`,
          songName: sql`excluded."songName"`,
          songSubName: sql`excluded."songSubName"`,
          songAuthorName: sql`excluded."songAuthorName"`,
          levelAuthorName: sql`excluded."levelAuthorName"`,
          difficulty: sql`excluded."difficulty"`,
          characteristic: sql`excluded."characteristic"`,
          maxScore: sql`excluded."maxScore"`,
          ranked: sql`excluded."ranked"`,
          qualified: sql`excluded."qualified"`,
          stars: sql`excluded."stars"`,
          rankedDate: sql`excluded."rankedDate"`,
          qualifiedDate: sql`excluded."qualifiedDate"`,
          plays: sql`excluded."plays"`,
          dailyPlays: sql`excluded."dailyPlays"`,
          timestamp: sql`excluded."timestamp"`,
          seededScores: sql`${t.seededScores}`,
          cachedSongArt: sql`${t.cachedSongArt}`,
        },
      });
  }

  public static async lookupLeaderboards(
    page: number,
    options?: {
      ranked?: boolean;
      qualified?: boolean;
      category?: number;
      stars?: StarFilter;
      sort?: number;
      query?: string;
    }
  ): Promise<Page<ScoreSaberLeaderboard>> {
    const safePage = Math.max(1, page);
    const offset = (safePage - 1) * LEADERBOARD_SEARCH_PAGE_SIZE;

    const mainAlias = alias(scoreSaberLeaderboardsTable, "leaderboard");
    const difficultiesAlias = alias(scoreSaberLeaderboardsTable, "difficulties");

    const conditions: SQL[] = [];
    if (options?.ranked === true) conditions.push(eq(mainAlias.ranked, true));
    if (options?.qualified === true) conditions.push(eq(mainAlias.qualified, true));
    if (options?.stars) {
      conditions.push(gte(sql`coalesce(${mainAlias.stars}, 0)`, options.stars.min ?? 0));
      conditions.push(lte(sql`coalesce(${mainAlias.stars}, 0)`, options.stars.max ?? 0));
    }

    const searchTrimmed = options?.query?.trim() ?? "";
    const useFts = searchTrimmed.length >= 3;
    if (useFts) conditions.push(aliasFtsMatch(mainAlias, searchTrimmed));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const category = options?.category ?? MapCategory.DateRanked;
    const ascending = (options?.sort ?? MapSort.Descending) === MapSort.Ascending;
    const idTie = ascending ? asc(mainAlias.id) : desc(mainAlias.id);

    const orderParts = (() => {
      if (useFts) {
        const rank = aliasTsRankExpr(mainAlias, searchTrimmed);
        return ascending ? [asc(rank), idTie] : [desc(rank), idTie];
      }
      const starsCol = sql`coalesce(${mainAlias.stars}, 0)`;
      const dateFallback = sql`coalesce(${mainAlias.qualifiedDate}, ${mainAlias.timestamp})`;

      switch (category) {
        case MapCategory.ScoresSet:
          return ascending ? [asc(mainAlias.plays), idTie] : [desc(mainAlias.plays), idTie];
        case MapCategory.StarDifficulty:
          return ascending ? [asc(starsCol), idTie] : [desc(starsCol), idTie];
        case MapCategory.Author:
          return ascending ? [asc(mainAlias.levelAuthorName), idTie] : [desc(mainAlias.levelAuthorName), idTie];
        case MapCategory.DateRanked:
        default:
          return ascending
            ? [sql`${mainAlias.rankedDate} ASC NULLS LAST`, asc(dateFallback), idTie]
            : [sql`${mainAlias.rankedDate} DESC NULLS LAST`, desc(dateFallback), idTie];
      }
    })();

    const [countRow] = await db.select({ total: count() }).from(mainAlias).where(whereClause);
    const total = Number(countRow?.total ?? 0);

    const pageRows = await db
      .select()
      .from(mainAlias)
      .leftJoin(difficultiesAlias, eq(mainAlias.songHash, difficultiesAlias.songHash))
      .where(whereClause)
      .orderBy(...orderParts, asc(difficultySortSql(difficultiesAlias)))
      .limit(LEADERBOARD_SEARCH_PAGE_SIZE)
      .offset(offset);

    return {
      items: mergeJoinedLeaderboardRows(pageRows),
      metadata: {
        totalItems: total,
        totalPages: total === 0 ? 1 : Math.ceil(total / LEADERBOARD_SEARCH_PAGE_SIZE),
        page: safePage,
        itemsPerPage: LEADERBOARD_SEARCH_PAGE_SIZE
      },
    };
  }

  public static async getApproximateRowCount(): Promise<number> {
    const result = await db.execute<{ count: number }>(sql`
      SELECT GREATEST(0, reltuples)::bigint::integer AS count
      FROM pg_class
      WHERE oid = 'scoresaber-leaderboards'::regclass
    `);
    return Number(result.rows[0]?.count ?? 0);
  }
}