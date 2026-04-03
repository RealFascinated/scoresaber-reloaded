import { MapCategory, MapSort, StarFilter } from "@ssr/common/maps/types";
import type { Page } from "@ssr/common/pagination";
import { MapCharacteristic } from "@ssr/common/schemas/map/map-characteristic";
import { MapDifficulty } from "@ssr/common/schemas/map/map-difficulty";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import type { SQL } from "drizzle-orm";
import { and, asc, count, desc, eq, gte, inArray, isNotNull, lte, max, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  leaderboardByHashCacheKey,
  leaderboardByIdCacheKey,
  qualifiedLeaderboardsCacheKey,
  rankedLeaderboardsCacheKey,
  rankingQueueLeaderboardsCacheKey,
} from "../common/cache-keys";
import { db } from "../db";
import { mergeJoinedLeaderboardRows } from "../db/converter/scoresaber-leaderboard";
import { ScoreSaberLeaderboardRow, scoreSaberLeaderboardsTable } from "../db/schema";
import CacheService from "../service/infra/cache.service";

const LEADERBOARD_SEARCH_PAGE_SIZE = 20;

export type RankedLeaderboardSnapshotRow = {
  id: number;
  stars: number | null;
  ranked: boolean;
  qualified: boolean;
  plays: number;
  dailyPlays: number;
};

export type QualifiedLeaderboardSnapshotRow = {
  id: number;
  stars: number | null;
  ranked: boolean;
  qualified: boolean;
};

export class ScoreSaberLeaderboardsRepository {
  private static async invalidateLeaderboardCaches(leaderboard: {
    id: number;
    songHash: string;
    difficulty: MapDifficulty;
    characteristic: MapCharacteristic;
  }): Promise<void> {
    await Promise.all([
      CacheService.invalidate(leaderboardByIdCacheKey(leaderboard.id)),
      CacheService.invalidate(
        leaderboardByHashCacheKey(leaderboard.songHash, leaderboard.difficulty, leaderboard.characteristic)
      ),
      CacheService.invalidate(rankedLeaderboardsCacheKey),
      CacheService.invalidate(qualifiedLeaderboardsCacheKey),
      CacheService.invalidate(rankingQueueLeaderboardsCacheKey),
    ]);
  }

  public static leaderboardFtsMatch(search: string): SQL {
    return sql`to_tsvector('english', ${scoreSaberLeaderboardsTable.songName} || ' ' || ${scoreSaberLeaderboardsTable.songSubName} || ' ' || ${scoreSaberLeaderboardsTable.songAuthorName} || ' ' || ${scoreSaberLeaderboardsTable.levelAuthorName}) @@ plainto_tsquery('english', ${search})`;
  }

  public static leaderboardTsRankExpr(search: string): SQL {
    return sql`ts_rank(to_tsvector('english', ${scoreSaberLeaderboardsTable.songName} || ' ' || ${scoreSaberLeaderboardsTable.songSubName} || ' ' || ${scoreSaberLeaderboardsTable.songAuthorName} || ' ' || ${scoreSaberLeaderboardsTable.levelAuthorName}), plainto_tsquery('english', ${search}))`;
  }

  public static async findIdBySongHashDifficultyCharacteristic(
    hashNorm: string,
    difficulty: MapDifficulty,
    characteristic: MapCharacteristic
  ): Promise<number | undefined> {
    const [match] = await db
      .select({ id: scoreSaberLeaderboardsTable.id })
      .from(scoreSaberLeaderboardsTable)
      .where(
        and(
          eq(sql`lower(${scoreSaberLeaderboardsTable.songHash})`, hashNorm),
          eq(scoreSaberLeaderboardsTable.difficulty, difficulty),
          eq(scoreSaberLeaderboardsTable.characteristic, characteristic)
        )
      )
      .limit(1);
    return match?.id;
  }

  public static async getLeaderboardsWithDifficultiesByIds(
    ids: number[]
  ): Promise<Map<number, ScoreSaberLeaderboard>> {
    if (ids.length === 0) {
      return new Map();
    }
    const mainAlias = alias(scoreSaberLeaderboardsTable, "leaderboard");
    const difficultiesAlias = alias(scoreSaberLeaderboardsTable, "difficulties");

    const rows = await db
      .select()
      .from(mainAlias)
      .leftJoin(difficultiesAlias, eq(mainAlias.songHash, difficultiesAlias.songHash))
      .where(inArray(mainAlias.id, ids))
      .orderBy(
        asc(mainAlias.id),
        sql`CASE ${difficultiesAlias.difficulty}
            WHEN 'Easy' THEN 1
            WHEN 'Normal' THEN 2
            WHEN 'Hard' THEN 3
            WHEN 'Expert' THEN 4
            WHEN 'ExpertPlus' THEN 5
            ELSE 999
          END`
      );

    return new Map(mergeJoinedLeaderboardRows(rows).map(lb => [lb.id, lb]));
  }

  public static async existsById(id: number): Promise<boolean> {
    return (
      (
        await db
          .select({ exists: sql`1` })
          .from(scoreSaberLeaderboardsTable)
          .where(eq(scoreSaberLeaderboardsTable.id, id))
          .limit(1)
      ).length > 0
    );
  }

  public static async insert(
    id: number,
    leaderboard: ScoreSaberLeaderboard,
    cachedSongArt: boolean
  ): Promise<void> {
    const inserted = await db
      .insert(scoreSaberLeaderboardsTable)
      .values({
        id: id,
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
        cachedSongArt: cachedSongArt,
        timestamp: leaderboard.timestamp,
      })
      .onConflictDoNothing({ target: scoreSaberLeaderboardsTable.id })
      .returning({ id: scoreSaberLeaderboardsTable.id });

    if (inserted.length === 0) {
      return;
    }

    await ScoreSaberLeaderboardsRepository.invalidateLeaderboardCaches({
      id,
      songHash: leaderboard.songHash,
      difficulty: leaderboard.difficulty.difficulty,
      characteristic: leaderboard.difficulty.characteristic,
    });
  }

  public static async updateLeaderboardById(id: number, partial: Partial<ScoreSaberLeaderboardRow>) {
    await db.update(scoreSaberLeaderboardsTable).set(partial).where(eq(scoreSaberLeaderboardsTable.id, id));
    await CacheService.invalidate(leaderboardByIdCacheKey(id));
    await CacheService.invalidate(rankedLeaderboardsCacheKey);
    await CacheService.invalidate(qualifiedLeaderboardsCacheKey);
    await CacheService.invalidate(rankingQueueLeaderboardsCacheKey);
  }

  public static async upsertLeaderboards(leaderboards: ScoreSaberLeaderboard[]): Promise<void> {
    if (leaderboards.length === 0) {
      return;
    }

    const t = scoreSaberLeaderboardsTable;
    const rows = leaderboards.map(lb => ({
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
          seededScores: sql`"scoresaber-leaderboards"."seededScores"`,
          cachedSongArt: sql`"scoresaber-leaderboards"."cachedSongArt"`,
        },
      });

    await Promise.all([
      CacheService.invalidate(rankedLeaderboardsCacheKey),
      CacheService.invalidate(qualifiedLeaderboardsCacheKey),
      CacheService.invalidate(rankingQueueLeaderboardsCacheKey),
      ...leaderboards.map(leaderboard => CacheService.invalidate(leaderboardByIdCacheKey(leaderboard.id))),
      ...leaderboards.map(leaderboard =>
        CacheService.invalidate(
          leaderboardByHashCacheKey(
            leaderboard.songHash,
            leaderboard.difficulty.difficulty,
            leaderboard.difficulty.characteristic
          )
        )
      ),
    ]);
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

    const conditions: SQL[] = [];
    if (options?.ranked === true) {
      conditions.push(eq(scoreSaberLeaderboardsTable.ranked, true));
    }
    if (options?.qualified === true) {
      conditions.push(eq(scoreSaberLeaderboardsTable.qualified, true));
    }
    if (options?.stars) {
      const min = options.stars.min ?? 0;
      const max = options.stars.max ?? 0;
      conditions.push(gte(sql`coalesce(${scoreSaberLeaderboardsTable.stars}, 0)`, min));
      conditions.push(lte(sql`coalesce(${scoreSaberLeaderboardsTable.stars}, 0)`, max));
    }

    const searchTrimmed = options?.query?.trim() ?? "";
    const useFts = searchTrimmed.length >= 3;
    if (useFts) {
      conditions.push(ScoreSaberLeaderboardsRepository.leaderboardFtsMatch(searchTrimmed));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const category = options?.category ?? MapCategory.DateRanked;
    const sortDir = options?.sort ?? MapSort.Descending;
    const ascending = sortDir === MapSort.Ascending;
    const idTie = ascending ? asc(scoreSaberLeaderboardsTable.id) : desc(scoreSaberLeaderboardsTable.id);

    const orderParts = (() => {
      if (useFts) {
        const rank = ScoreSaberLeaderboardsRepository.leaderboardTsRankExpr(searchTrimmed);
        return ascending ? [asc(rank), idTie] : [desc(rank), idTie];
      }

      const starsCol = sql`coalesce(${scoreSaberLeaderboardsTable.stars}, 0)`;
      const dateFallback = sql`coalesce(${scoreSaberLeaderboardsTable.qualifiedDate}, ${scoreSaberLeaderboardsTable.timestamp})`;

      switch (category) {
        case MapCategory.ScoresSet:
          return ascending
            ? [asc(scoreSaberLeaderboardsTable.plays), idTie]
            : [desc(scoreSaberLeaderboardsTable.plays), idTie];
        case MapCategory.StarDifficulty:
          return ascending ? [asc(starsCol), idTie] : [desc(starsCol), idTie];
        case MapCategory.Author:
          return ascending
            ? [asc(scoreSaberLeaderboardsTable.levelAuthorName), idTie]
            : [desc(scoreSaberLeaderboardsTable.levelAuthorName), idTie];
        case MapCategory.DateRanked:
        default:
          return ascending
            ? [sql`${scoreSaberLeaderboardsTable.rankedDate} ASC NULLS LAST`, asc(dateFallback), idTie]
            : [sql`${scoreSaberLeaderboardsTable.rankedDate} DESC NULLS LAST`, desc(dateFallback), idTie];
      }
    })();

    const [countRow] = await db
      .select({ total: count() })
      .from(scoreSaberLeaderboardsTable)
      .where(whereClause);

    const total = Number(countRow?.total ?? 0);
    const itemsPerPage = LEADERBOARD_SEARCH_PAGE_SIZE;
    const totalPages = total === 0 ? 1 : Math.ceil(total / itemsPerPage);

    const pageRows = await db
      .select()
      .from(scoreSaberLeaderboardsTable)
      .where(whereClause)
      .orderBy(...orderParts)
      .limit(LEADERBOARD_SEARCH_PAGE_SIZE)
      .offset(offset);

    const ids = pageRows.map(r => r.id);
    const lbMap = await ScoreSaberLeaderboardsRepository.getLeaderboardsWithDifficultiesByIds(ids);
    const leaderboards = ids.map(id => lbMap.get(id)).filter((lb): lb is ScoreSaberLeaderboard => lb != null);

    return {
      items: leaderboards,
      metadata: {
        totalItems: total,
        totalPages,
        page: safePage,
        itemsPerPage,
      },
    };
  }

  public static async searchLeaderboardIds(search: string, limit: number = 50): Promise<number[]> {
    if (search.length < 3) {
      return [];
    }

    const result = await db
      .select({ id: scoreSaberLeaderboardsTable.id })
      .from(scoreSaberLeaderboardsTable)
      .where(ScoreSaberLeaderboardsRepository.leaderboardFtsMatch(search))
      .orderBy(desc(ScoreSaberLeaderboardsRepository.leaderboardTsRankExpr(search)))
      .limit(limit);

    return result.map(r => r.id);
  }

  public static async getRankedLeaderboards(): Promise<ScoreSaberLeaderboard[]> {
    const t = scoreSaberLeaderboardsTable;
    const idRows = await db
      .select({ id: max(t.id) })
      .from(t)
      .where(eq(t.ranked, true))
      .groupBy(t.songHash);

    const ids = idRows.map(r => Number(r.id)).sort((a, b) => b - a);
    const lbMap = await ScoreSaberLeaderboardsRepository.getLeaderboardsWithDifficultiesByIds(ids);
    return ids.map(id => lbMap.get(id)).filter((lb): lb is ScoreSaberLeaderboard => lb != null);
  }

  public static async getQualifiedLeaderboards(): Promise<ScoreSaberLeaderboard[]> {
    const t = scoreSaberLeaderboardsTable;
    const idRows = await db
      .select({ id: max(t.id) })
      .from(t)
      .where(eq(t.qualified, true))
      .groupBy(t.songHash);

    const ids = idRows.map(r => Number(r.id)).sort((a, b) => b - a);
    const lbMap = await ScoreSaberLeaderboardsRepository.getLeaderboardsWithDifficultiesByIds(ids);
    return ids.map(id => lbMap.get(id)).filter((lb): lb is ScoreSaberLeaderboard => lb != null);
  }

  public static async getRankedLeaderboardsByStarsBetween(
    minStars: number,
    maxStars: number
  ): Promise<ScoreSaberLeaderboard[]> {
    const mainAlias = alias(scoreSaberLeaderboardsTable, "leaderboard");
    const difficultiesAlias = alias(scoreSaberLeaderboardsTable, "difficulties");

    const rankedJoinRows = await db
      .select()
      .from(mainAlias)
      .leftJoin(difficultiesAlias, eq(mainAlias.songHash, difficultiesAlias.songHash))
      .where(
        and(
          eq(mainAlias.ranked, true),
          isNotNull(mainAlias.stars),
          gte(mainAlias.stars, minStars),
          lte(mainAlias.stars, maxStars)
        )
      )
      .orderBy(asc(mainAlias.stars));

    return mergeJoinedLeaderboardRows(rankedJoinRows);
  }

  public static async getApproximateRowCount(): Promise<number> {
    const result = await db.execute<{ count: number }>(sql`
      SELECT GREATEST(0, reltuples)::bigint::integer AS count
      FROM pg_class
      WHERE oid = 'scoresaber-leaderboards'::regclass
    `);
    return Number(result.rows[0]?.count ?? 0);
  }

  public static async getRankedSnapshots(): Promise<RankedLeaderboardSnapshotRow[]> {
    return db
      .select({
        id: scoreSaberLeaderboardsTable.id,
        stars: scoreSaberLeaderboardsTable.stars,
        ranked: scoreSaberLeaderboardsTable.ranked,
        qualified: scoreSaberLeaderboardsTable.qualified,
        plays: scoreSaberLeaderboardsTable.plays,
        dailyPlays: scoreSaberLeaderboardsTable.dailyPlays,
      })
      .from(scoreSaberLeaderboardsTable)
      .where(eq(scoreSaberLeaderboardsTable.ranked, true));
  }

  public static async getQualifiedSnapshots(): Promise<QualifiedLeaderboardSnapshotRow[]> {
    return db
      .select({
        id: scoreSaberLeaderboardsTable.id,
        stars: scoreSaberLeaderboardsTable.stars,
        ranked: scoreSaberLeaderboardsTable.ranked,
        qualified: scoreSaberLeaderboardsTable.qualified,
      })
      .from(scoreSaberLeaderboardsTable)
      .where(eq(scoreSaberLeaderboardsTable.qualified, true));
  }
}
