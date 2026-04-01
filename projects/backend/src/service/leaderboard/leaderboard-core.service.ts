import { CooldownPriority } from "@ssr/common/cooldown";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger from "@ssr/common/logger";
import { MapCategory, MapSort, StarFilter } from "@ssr/common/maps/types";
import { StorageBucket } from "@ssr/common/minio-buckets";
import type { Page } from "@ssr/common/pagination";
import { MapCharacteristic } from "@ssr/common/schemas/map/map-characteristic";
import { MapDifficulty } from "@ssr/common/schemas/map/map-difficulty";
import { ScoreSaberLeaderboardDifficulty } from "@ssr/common/schemas/scoresaber/leaderboard/difficulty";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { getScoreSaberLeaderboardFromToken } from "@ssr/common/token-creators";
import ScoreSaberLeaderboardToken from "@ssr/common/types/token/scoresaber/leaderboard";
import Request from "@ssr/common/utils/request";
import { getScoreSaberDifficultyFromDifficulty } from "@ssr/common/utils/scoresaber.util";
import { formatDuration } from "@ssr/common/utils/time-utils";
import type { SQL } from "drizzle-orm";
import { and, asc, count, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../db";
import { mergeJoinedLeaderboardRows } from "../../db/converter/scoresaber-leaderboard";
import { scoreSaberLeaderboardsTable } from "../../db/schema";
import { LeaderboardScoreSeedQueue } from "../../queue/impl/leaderboard-score-seed-queue";
import { QueueId, QueueManager } from "../../queue/queue-manager";
import CacheService, { CacheId } from "../cache.service";
import { ScoreSaberApiService } from "../scoresaber-api.service";
import StorageService from "../storage.service";

const LEADERBOARD_SEARCH_PAGE_SIZE = 20;

export class LeaderboardCoreService {
  /**
   * Gets a ScoreSaber leaderboard by ID.
   *
   * @param id the ID of the leaderboard to get
   * @param options the options to use for the fetch
   * @returns the fetched leaderboard
   */
  public static async getLeaderboard(id: number): Promise<ScoreSaberLeaderboard> {
    return await CacheService.fetch(CacheId.Leaderboards, `leaderboard:id:${id}`, async () => {
      const map = await LeaderboardCoreService.getLeaderboardsWithDifficultiesByIds([id]);
      const leaderboard = map.get(id);
      if (!leaderboard) {
        return await LeaderboardCoreService.createLeaderboard(id);
      }
      return leaderboard;
    });
  }

  /**
   * Gets a ScoreSaber leaderboard by hash.
   *
   * @param hash the hash of the leaderboard to get
   * @param difficulty the difficulty of the leaderboard to get
   * @param characteristic the characteristic of the leaderboard to get
   * @param options the options to use for the fetch
   * @returns the fetched leaderboard
   */
  public static async getLeaderboardByHash(
    hash: string,
    difficulty: MapDifficulty,
    characteristic: MapCharacteristic
  ): Promise<ScoreSaberLeaderboard> {
    return await CacheService.fetch(
      CacheId.Leaderboards,
      `leaderboard:hash:${hash}:${difficulty}:${characteristic}`,
      async () => {
        const hashNorm = hash.trim().toLowerCase();

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

        if (match) {
          const map = await LeaderboardCoreService.getLeaderboardsWithDifficultiesByIds([match.id]);
          const fromDb = map.get(match.id);
          if (fromDb) {
            return fromDb;
          }
        }

        const before = performance.now();
        const leaderboardToken = await ScoreSaberApiService.lookupLeaderboardByHash(
          hash,
          getScoreSaberDifficultyFromDifficulty(difficulty),
          characteristic
        );
        if (leaderboardToken == undefined) {
          throw new NotFoundError(
            `Leaderboard not found for hash "${hash}", difficulty "${difficulty}", characteristic "${characteristic}"`
          );
        }
        const leaderboard = getScoreSaberLeaderboardFromToken(leaderboardToken);

        await LeaderboardCoreService.saveLeaderboard(leaderboard.id, leaderboard);
        (QueueManager.getQueue(QueueId.LeaderboardScoreSeedQueue) as LeaderboardScoreSeedQueue).add({
          id: leaderboard.id.toString(),
          data: leaderboard.id,
        });

        Logger.info(
          `Created leaderboard "${leaderboard.id}" in ${formatDuration(performance.now() - before)}`
        );
        return leaderboard;
      }
    );
  }

  /**
   * Loads leaderboard rows with all difficulties for the same song (self-join on song hash).
   */
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

  /**
   * Checks if a leaderboard exists.
   *
   * @param id the ID of the leaderboard to check
   * @returns whether the leaderboard exists
   */
  public static async leaderboardExists(id: number): Promise<boolean> {
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

  /**
   * Fetches a leaderboard from the ScoreSaber API and saves it to the database.
   *
   * @param id the ID of the leaderboard to fetch
   * @param token the ScoreSaber leaderboard token to use
   * @returns the fetched leaderboard
   */
  public static async createLeaderboard(
    id: number,
    token?: ScoreSaberLeaderboardToken,
    options?: { skipScoreSeedQueue?: boolean }
  ): Promise<ScoreSaberLeaderboard> {
    const before = performance.now();
    const leaderboardToken = token ?? (await ScoreSaberApiService.lookupLeaderboard(id));
    if (leaderboardToken == undefined) {
      throw new NotFoundError(`Leaderboard not found for "${id}"`);
    }
    const leaderboard = getScoreSaberLeaderboardFromToken(leaderboardToken);

    await LeaderboardCoreService.saveLeaderboard(id, leaderboard);
    if (!options?.skipScoreSeedQueue) {
      (QueueManager.getQueue(QueueId.LeaderboardScoreSeedQueue) as LeaderboardScoreSeedQueue).add({
        id: leaderboard.id.toString(),
        data: leaderboard.id,
      });
    }

    Logger.info(`Created leaderboard "${id}" in ${formatDuration(performance.now() - before)}`);
    return leaderboard;
  }

  /**
   * Fetches all leaderboards from the ScoreSaber API
   *
   * @param filter the filter to use for the fetch
   * @returns the fetched leaderboards
   */
  public static async fetchLeaderboardsFromAPI(
    status: "ranked" | "qualified",
    logProgress: boolean = false
  ): Promise<{
    leaderboards: ScoreSaberLeaderboard[];
    leaderboardDifficulties: Map<string, ScoreSaberLeaderboardDifficulty[]>;
  }> {
    const leaderboards: ScoreSaberLeaderboard[] = [];
    const leaderboardDifficulties: Map<string, ScoreSaberLeaderboardDifficulty[]> = new Map();

    let hasMorePages = true;
    let page = 1;

    while (hasMorePages) {
      const response = await ScoreSaberApiService.lookupLeaderboards(page, {
        [status]: true,
        priority: CooldownPriority.LOW,
      });
      if (!response) {
        hasMorePages = false;
        continue;
      }

      const totalPages = Math.ceil(response.metadata.total / response.metadata.itemsPerPage);
      for (const token of response.leaderboards) {
        const leaderboard = getScoreSaberLeaderboardFromToken(token);
        leaderboards.push(leaderboard);

        // Since ScoreSaber only returns the difficulties for the
        // leaderboard, we need to store them in a map to fetch them all.
        const difficulties = leaderboardDifficulties.get(leaderboard.songHash) ?? [];
        difficulties.push({
          id: leaderboard.id,
          difficulty: leaderboard.difficulty.difficulty,
          characteristic: leaderboard.difficulty.characteristic,
        });
        leaderboardDifficulties.set(leaderboard.songHash, difficulties);
      }

      if (logProgress && (page % 10 === 0 || page === 1 || page >= totalPages)) {
        Logger.info(`Fetched ${response.leaderboards.length} leaderboards on page ${page}/${totalPages}.`);
      }

      page++;
      hasMorePages = page < totalPages;
    }

    return { leaderboards, leaderboardDifficulties };
  }

  /**
   * Saves a leaderboard to the database.
   *
   * @param id the ID of the leaderboard to save
   * @param leaderboard the leaderboard to save
   * @returns the saved leaderboard
   */
  public static async saveLeaderboard(id: number, leaderboard: ScoreSaberLeaderboard) {
    const cachedSongArt = await LeaderboardCoreService.cacheLeaderboardSongArt(leaderboard);

    await db.insert(scoreSaberLeaderboardsTable).values({
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
    });
  }

  /**
   * Bulk upsert leaderboards from ScoreSaber API sync (ranked/qualified refresh).
   * Does not run song-art caching. Preserves `seededScores` and `cachedSongArt` on existing rows.
   */
  public static async upsertLeaderboardsFromRankingApi(leaderboards: ScoreSaberLeaderboard[]): Promise<void> {
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
  }

  /**
   * Searches leaderboards from Postgres (full-text search + filters).
   * `verified` is ignored (not stored). `priority` is ignored (no upstream call).
   * Default category/sort is latest ranked maps (`rankedDate` desc, unranked last).
   */
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
      conditions.push(LeaderboardCoreService.leaderboardFtsMatch(searchTrimmed));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const category = options?.category ?? MapCategory.DateRanked;
    const sortDir = options?.sort ?? MapSort.Descending;
    const ascending = sortDir === MapSort.Ascending;
    const idTie = ascending ? asc(scoreSaberLeaderboardsTable.id) : desc(scoreSaberLeaderboardsTable.id);

    const orderParts = (() => {
      if (useFts) {
        const rank = LeaderboardCoreService.leaderboardTsRankExpr(searchTrimmed);
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
    const lbMap = await LeaderboardCoreService.getLeaderboardsWithDifficultiesByIds(ids);
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

  /**
   * Searches for leaderboard IDs by name.
   *
   * @param search the search query
   * @param limit the limit of the search
   * @returns the leaderboard IDs that match the search query
   */
  public static async searchLeaderboardIds(search: string, limit: number = 50): Promise<number[]> {
    if (search.length < 3) {
      return [];
    }

    const result = await db
      .select({ id: scoreSaberLeaderboardsTable.id })
      .from(scoreSaberLeaderboardsTable)
      .where(LeaderboardCoreService.leaderboardFtsMatch(search))
      .orderBy(desc(LeaderboardCoreService.leaderboardTsRankExpr(search)))
      .limit(limit);

    return result.map(r => r.id);
  }

  /**
   * Gets all the ranked leaderboards
   */
  public static async getRankedLeaderboards(): Promise<ScoreSaberLeaderboard[]> {
    return CacheService.fetch(CacheId.Leaderboards, "leaderboard:ranked-leaderboards", async () => {
      const mainAlias = alias(scoreSaberLeaderboardsTable, "leaderboard");
      const difficultiesAlias = alias(scoreSaberLeaderboardsTable, "difficulties");

      const result = await db
        .select()
        .from(mainAlias)
        .leftJoin(difficultiesAlias, eq(mainAlias.songHash, difficultiesAlias.songHash))
        .where(eq(mainAlias.ranked, true))
        .orderBy(desc(mainAlias.id));

      return mergeJoinedLeaderboardRows(result);
    });
  }

  /**
   * Gets all the qualified leaderboards
   */
  public static async getQualifiedLeaderboards(): Promise<ScoreSaberLeaderboard[]> {
    return CacheService.fetch(CacheId.Leaderboards, "leaderboard:qualified-leaderboards", async () => {
      const mainAlias = alias(scoreSaberLeaderboardsTable, "leaderboard");
      const difficultiesAlias = alias(scoreSaberLeaderboardsTable, "difficulties");

      const result = await db
        .select()
        .from(mainAlias)
        .leftJoin(difficultiesAlias, eq(mainAlias.songHash, difficultiesAlias.songHash))
        .where(eq(mainAlias.qualified, true));

      return mergeJoinedLeaderboardRows(result);
    });
  }

  /**
   * Gets the ranking queue leaderboards
   */
  public static async getRankingQueueLeaderboards(): Promise<ScoreSaberLeaderboard[]> {
    return CacheService.fetch(CacheId.Leaderboards, "leaderboard:ranking-queue-maps", async () => {
      const rankingQueueTokens = await ScoreSaberApiService.lookupRankingRequests();
      if (!rankingQueueTokens) {
        return [];
      }

      return rankingQueueTokens.all.map(token => getScoreSaberLeaderboardFromToken(token.leaderboardInfo));
    });
  }

  /**
   * Gets the approximate total number of leaderboards.
   *
   * @returns the approximate total number of leaderboards
   */
  public static async getTotalLeaderboardsCount(): Promise<number> {
    const result = await db.execute<{ count: number }>(sql`
      SELECT GREATEST(0, reltuples)::bigint::integer AS count
      FROM pg_class
      WHERE oid = 'scoresaber-leaderboards'::regclass
    `);
    return Number(result.rows[0]?.count ?? 0);
  }

  /**
   * Caches the song art for a leaderboard.
   *
   * @param leaderboard the leaderboard to cache the song art for
   */
  public static async cacheLeaderboardSongArt(leaderboard: ScoreSaberLeaderboard): Promise<boolean> {
    const hashNorm = leaderboard.songHash.trim().toLowerCase();
    const objectKey = `${leaderboard.songHash}.png`;

    const exists = await StorageService.fileExists(StorageBucket.LeaderboardSongArt, objectKey);
    if (exists) {
      await db
        .update(scoreSaberLeaderboardsTable)
        .set({ cachedSongArt: true })
        .where(
          and(
            sql`lower(${scoreSaberLeaderboardsTable.songHash}) = ${hashNorm}`,
            eq(scoreSaberLeaderboardsTable.cachedSongArt, false)
          )
        );
      return true;
    }

    const request = await Request.get<ArrayBuffer>(
      `https://cdn.scoresaber.com/covers/${leaderboard.songHash}.png`,
      {
        returns: "arraybuffer",
      }
    );
    if (request) {
      await StorageService.saveFile(StorageBucket.LeaderboardSongArt, objectKey, Buffer.from(request));

      await db
        .update(scoreSaberLeaderboardsTable)
        .set({ cachedSongArt: true })
        .where(sql`lower(${scoreSaberLeaderboardsTable.songHash}) = ${hashNorm}`);

      Logger.info(`Cached song art for leaderboard ${leaderboard.id}: ${leaderboard.songHash}`);
      return true;
    }

    Logger.warn(`Failed to cache song art for leaderboard ${leaderboard.id}: ${leaderboard.songHash}`);
    return false;
  }

  private static leaderboardFtsMatch(search: string): SQL {
    return sql`to_tsvector('english', ${scoreSaberLeaderboardsTable.songName} || ' ' || ${scoreSaberLeaderboardsTable.songSubName} || ' ' || ${scoreSaberLeaderboardsTable.songAuthorName} || ' ' || ${scoreSaberLeaderboardsTable.levelAuthorName}) @@ plainto_tsquery('english', ${search})`;
  }

  private static leaderboardTsRankExpr(search: string): SQL {
    return sql`ts_rank(to_tsvector('english', ${scoreSaberLeaderboardsTable.songName} || ' ' || ${scoreSaberLeaderboardsTable.songSubName} || ' ' || ${scoreSaberLeaderboardsTable.songAuthorName} || ' ' || ${scoreSaberLeaderboardsTable.levelAuthorName}), plainto_tsquery('english', ${search}))`;
  }
}
