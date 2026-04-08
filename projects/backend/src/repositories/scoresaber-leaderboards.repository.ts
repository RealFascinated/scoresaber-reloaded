import { MapCharacteristic } from "@ssr/common/schemas/map/map-characteristic";
import { MapDifficulty } from "@ssr/common/schemas/map/map-difficulty";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import type {
  ScoreSaberLeaderboardQueryCategory,
  ScoreSaberLeaderboardQueryFilters,
} from "@ssr/common/schemas/scoresaber/leaderboard/query-filters";
import type { SQL } from "drizzle-orm";
import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../db";
import { leaderboardRowToType } from "../db/converter/scoresaber-leaderboard";
import { ScoreSaberLeaderboardRow, scoreSaberLeaderboardsTable } from "../db/schema";
import { TableCountsRepository } from "./table-counts.repository";

export const LEADERBOARD_SEARCH_PAGE_SIZE = 20;

type LeaderboardAlias = ReturnType<typeof alias<typeof scoreSaberLeaderboardsTable, string>>;

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

function buildDifficultyJoin(
  mainAlias: LeaderboardAlias,
  filters?: { ranked?: boolean; qualified?: boolean }
) {
  const difficultiesAlias = alias(scoreSaberLeaderboardsTable, "difficulties");

  const joinConditions: SQL[] = [eq(mainAlias.songHash, difficultiesAlias.songHash)];
  if (filters?.ranked !== undefined) {
    joinConditions.push(eq(difficultiesAlias.ranked, filters.ranked));
  }
  if (filters?.qualified !== undefined) {
    joinConditions.push(eq(difficultiesAlias.qualified, filters.qualified));
  }

  return {
    difficultiesAlias,
    select: {
      leaderboard: mainAlias,
      difficulties: {
        id: difficultiesAlias.id,
        stars: difficultiesAlias.stars,
        difficulty: difficultiesAlias.difficulty,
        characteristic: difficultiesAlias.characteristic,
      },
    },
    on: and(...joinConditions) as SQL,
    orderBy: asc(difficultySortSql(difficultiesAlias)),
  };
}

export function aliasFtsMatch(tableAlias: LeaderboardAlias, search: string): SQL {
  return sql`to_tsvector('english', ${tableAlias.songName} || ' ' || ${tableAlias.songSubName} || ' ' || ${tableAlias.songAuthorName} || ' ' || ${tableAlias.levelAuthorName}) @@ plainto_tsquery('english', ${search})`;
}

export function aliasTsRankExpr(tableAlias: LeaderboardAlias, search: string): SQL {
  return sql`ts_rank(to_tsvector('english', ${tableAlias.songName} || ' ' || ${tableAlias.songSubName} || ' ' || ${tableAlias.songAuthorName} || ' ' || ${tableAlias.levelAuthorName}), plainto_tsquery('english', ${search}))`;
}

/**
 * Table sort for leaderboard search / playlists: one primary column (+ optional date fallback) and id tie-break.
 */
export function leaderboardSearchCategoryOrderBy(
  category: ScoreSaberLeaderboardQueryCategory,
  ascending: boolean
): SQL[] {
  const idTie = ascending ? asc(scoreSaberLeaderboardsTable.id) : desc(scoreSaberLeaderboardsTable.id);
  const starsCol = sql`coalesce(${scoreSaberLeaderboardsTable.stars}, 0)`;

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
        ? [sql`${scoreSaberLeaderboardsTable.rankedDate} ASC NULLS LAST`, idTie]
        : [sql`${scoreSaberLeaderboardsTable.rankedDate} DESC NULLS LAST`, idTie];
    case "trending":
      return ascending
        ? [sql`${scoreSaberLeaderboardsTable.trendingScore} ASC NULLS LAST`, idTie]
        : [sql`${scoreSaberLeaderboardsTable.trendingScore} DESC NULLS LAST`, idTie];
  }
}

/**
 * Builds the WHERE and ORDER BY clauses for a leaderboard query.
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
    conditions.push(eq(scoreSaberLeaderboardsTable.ranked, true));
  }
  if (filters?.qualified === true) {
    conditions.push(eq(scoreSaberLeaderboardsTable.qualified, true));
  }
  if (filters?.minStars) {
    conditions.push(gte(sql`coalesce(${scoreSaberLeaderboardsTable.stars}, 0)`, filters.minStars));
  }
  if (filters?.maxStars) {
    conditions.push(lte(sql`coalesce(${scoreSaberLeaderboardsTable.stars}, 0)`, filters.maxStars));
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
   * All matching leaderboards (no limit) using the same filter/sort semantics as paginated search.
   */
  public static async getLeaderboards(
    filters?: ScoreSaberLeaderboardQueryFilters
  ): Promise<ScoreSaberLeaderboard[]> {
    const { whereClause, orderParts } = buildLeaderboardQuery(filters);
    const rows = await db
      .select()
      .from(scoreSaberLeaderboardsTable)
      .where(whereClause)
      .orderBy(...orderParts);
    return rows.map(row => leaderboardRowToType(row));
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
      const { difficultiesAlias, select, on, orderBy: diffOrder } = buildDifficultyJoin(mainAlias);
      const rows = await db
        .select(select)
        .from(mainAlias)
        .leftJoin(difficultiesAlias, on)
        .where(where)
        .orderBy(diffOrder);
      return mergeJoinedRows(rows)[0];
    }

    const rows = await db.select().from(mainAlias).where(where).limit(1);
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
    includeDifficulties: boolean = true
  ): Promise<ScoreSaberLeaderboard | undefined> {
    const mainAlias = alias(scoreSaberLeaderboardsTable, "leaderboard");

    if (includeDifficulties) {
      const { difficultiesAlias, select, on, orderBy: diffOrder } = buildDifficultyJoin(mainAlias);
      const rows = await db
        .select(select)
        .from(mainAlias)
        .leftJoin(difficultiesAlias, on)
        .where(eq(mainAlias.id, id))
        .orderBy(diffOrder);
      return mergeJoinedRows(rows)[0];
    }

    const rows = await db.select().from(mainAlias).where(eq(mainAlias.id, id));
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
    includeDifficulties: boolean = true
  ): Promise<ScoreSaberLeaderboard[]> {
    const mainAlias = alias(scoreSaberLeaderboardsTable, "leaderboard");

    if (includeDifficulties) {
      const { difficultiesAlias, select, on, orderBy: diffOrder } = buildDifficultyJoin(mainAlias);
      const rows = await db
        .select(select)
        .from(mainAlias)
        .leftJoin(difficultiesAlias, on)
        .where(inArray(mainAlias.id, ids))
        .orderBy(asc(mainAlias.id), diffOrder);
      return mergeJoinedRows(rows);
    }

    const rows = await db.select().from(mainAlias).where(inArray(mainAlias.id, ids));
    return rows.map(row => leaderboardRowToType(row));
  }

  public static getRankedLeaderboards(): Promise<ScoreSaberLeaderboard[]> {
    return ScoreSaberLeaderboardsRepository.getLeaderboards({ ranked: true });
  }

  public static getQualifiedLeaderboards(): Promise<ScoreSaberLeaderboard[]> {
    return ScoreSaberLeaderboardsRepository.getLeaderboards({ qualified: true });
  }

  public static async getTopTrendingLeaderboards(limit: number = 100): Promise<ScoreSaberLeaderboard[]> {
    const rows = await db
      .select()
      .from(scoreSaberLeaderboardsTable)
      .orderBy(...leaderboardSearchCategoryOrderBy("trending", false))
      .limit(limit);

    return rows.map(row => leaderboardRowToType(row));
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

  public static async updateLeaderboard(
    id: number,
    partial: Partial<ScoreSaberLeaderboardRow>
  ): Promise<void> {
    await db.update(scoreSaberLeaderboardsTable).set(partial).where(eq(scoreSaberLeaderboardsTable.id, id));
  }

  public static async upsertLeaderboards(leaderboards: ScoreSaberLeaderboard[]): Promise<void> {
    if (leaderboards.length === 0) {
      return;
    }

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
      trendingScore: 0,
      timestamp: lb.timestamp,
    }));

    await db
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
          ranked: sql`excluded."ranked"`,
          qualified: sql`excluded."qualified"`,
          stars: sql`excluded."stars"`,
          rankedDate: sql`excluded."rankedDate"`,
          qualifiedDate: sql`excluded."qualifiedDate"`,
          plays: sql`excluded."plays"`,
          dailyPlays: sql`excluded."dailyPlays"`,
          timestamp: sql`excluded."timestamp"`,
          seededScores: sql`${scoreSaberLeaderboardsTable.seededScores}`,
          cachedSongArt: sql`${scoreSaberLeaderboardsTable.cachedSongArt}`,
        },
      });
  }

  public static async countTotal(): Promise<number> {
    const counts = await TableCountsRepository.getCounts();
    return counts.scoresaberLeaderboards;
  }
}
