import { SSRCache } from "@ssr/common/cache";
import { InternalServerError } from "@ssr/common/error/internal-server-error";
import Logger, { type ScopedLogger } from "@ssr/common/logger";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { isProduction } from "@ssr/common/utils/utils";
import { parse, stringify } from "devalue";
import { redisClient } from "../../common/redis";
import CachePerformanceMetric from "../../metrics/impl/backend/cache-performance";

export enum CacheId {
  BEATSAVER_MAP_BY_HASH = "beatsaver_map_by_hash",
  SCORESABER_PLAYER = "scoresaber_player",
  SCORESABER_PLAYER_EXISTS = "scoresaber_player_exists",
  SCORESABER_API_RESPONSE = "scoresaber_api_response",
  SCORESABER_LEADERBOARDS = "scoresaber_leaderboards",
  SCORESABER_LEADERBOARD_STAR_CHANGE = "scoresaber_leaderboard_star_change",
  BEATLEADER_SCORE = "beatleader_score",
  SCORESABER_SCORE_HISTORY_GRAPH = "scoresaber_score_history_graph",
}

export type CacheMode = "REDIS" | "MEMORY";

export default class CacheService {
  private static readonly logger: ScopedLogger = Logger.withTopic("Cache");
  private static readonly memoryCaches = new Map<CacheId, SSRCache>();
  /**
   * In-flight request coalescing per cache key.
   * Prevents cache stampedes under concurrent load for the same missing key.
   */
  private static readonly inFlightRequests = new Map<string, Promise<unknown>>();

  public static readonly CACHE_INFO: Record<CacheId, { ttl: number; mode: CacheMode }> = {
    // Memory caches
    [CacheId.SCORESABER_PLAYER]: {
      ttl: TimeUnit.toSeconds(TimeUnit.Minute, 2),
      mode: "MEMORY",
    },
    [CacheId.SCORESABER_PLAYER_EXISTS]: {
      ttl: TimeUnit.toSeconds(TimeUnit.Hour, 6),
      mode: "MEMORY",
    },
    [CacheId.SCORESABER_API_RESPONSE]: {
      ttl: TimeUnit.toSeconds(TimeUnit.Minute, 2),
      mode: "MEMORY",
    },
    [CacheId.SCORESABER_LEADERBOARDS]: {
      ttl: TimeUnit.toSeconds(TimeUnit.Hour, 2),
      mode: "MEMORY",
    },
    [CacheId.SCORESABER_LEADERBOARD_STAR_CHANGE]: {
      ttl: TimeUnit.toSeconds(TimeUnit.Hour, 1),
      mode: "MEMORY",
    },

    // Redis caches
    [CacheId.BEATSAVER_MAP_BY_HASH]: {
      ttl: TimeUnit.toSeconds(TimeUnit.Day, 7),
      mode: "REDIS",
    },
    [CacheId.BEATLEADER_SCORE]: {
      ttl: TimeUnit.toSeconds(TimeUnit.Hour, 1),
      mode: "REDIS",
    },
    [CacheId.SCORESABER_SCORE_HISTORY_GRAPH]: {
      ttl: TimeUnit.toSeconds(TimeUnit.Hour, 1),
      mode: "REDIS",
    },
  };

  public static async get<T>(cache: CacheId, cacheKey: string): Promise<T | undefined> {
    // Skip cache in development
    if (!isProduction()) {
      return undefined;
    }

    if (cache == undefined) {
      throw new InternalServerError(`Cache is not defined`);
    }
    if (cacheKey === "" || cacheKey === undefined) {
      throw new InternalServerError(`Cache key is not defined`);
    }

    const mode = this.CACHE_INFO[cache].mode;
    if (mode === "REDIS") {
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData !== null) {
        try {
          CachePerformanceMetric.recordHit(cache, mode);
          return parse(cachedData) as T;
        } catch {
          CacheService.logger.warn(`Failed to parse cached data for ${cacheKey}, removing from cache`);
          await redisClient.del(cacheKey);
        }
      }
    } else {
      const cached = this.getMemoryCache(cache).get<T>(cacheKey);
      if (cached !== undefined) {
        CachePerformanceMetric.recordHit(cache, mode);
        return cached;
      }
    }

    CachePerformanceMetric.recordMiss(cache, mode);
    return undefined;
  }

  public static async insert<T>(cache: CacheId, cacheKey: string, data: T): Promise<void> {
    // Skip cache in development
    if (!isProduction()) {
      return;
    }

    if (cache == undefined) {
      throw new InternalServerError(`Cache is not defined`);
    }
    if (cacheKey === "" || cacheKey === undefined) {
      throw new InternalServerError(`Cache key is not defined`);
    }
    if (data === undefined) {
      return;
    }

    const mode = this.CACHE_INFO[cache].mode;
    if (mode === "REDIS") {
      const result = await redisClient.set(cacheKey, stringify(data), "EX", this.CACHE_INFO[cache].ttl);
      if (result !== "OK") {
        throw new InternalServerError(`Failed to set cache for ${cacheKey}`);
      }
      return;
    }

    this.getMemoryCache(cache).set(cacheKey, data);
  }

  /**
   * Fetches data with caching. If the data is not in cache, the fetchFn is called and the data is cached.
   * If the data is in cache, it is returned immediately.
   *
   * @param cache the cache to fetch from
   * @param cacheKey the key used for caching.
   * @param fetchFn the function to fetch data if it's not in cache.
   */
  public static async fetch<T>(cache: CacheId, cacheKey: string, fetchFn: () => Promise<T>): Promise<T> {
    // Skip cache in development
    if (!isProduction()) {
      return fetchFn();
    }

    if (cache == undefined) {
      throw new InternalServerError(`Cache is not defined`);
    }
    if (cacheKey === "" || cacheKey === undefined) {
      throw new InternalServerError(`Cache key is not defined`);
    }

    const mode = this.CACHE_INFO[cache].mode;

    const inFlightKey = `${cache}:${cacheKey}`;
    const existingInFlight = this.inFlightRequests.get(inFlightKey);
    if (existingInFlight) {
      return (await existingInFlight) as T;
    }

    const cacheAndReturn = async () => {
      if (mode === "REDIS") {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData !== null) {
          try {
            CachePerformanceMetric.recordHit(cache, mode);
            return parse(cachedData) as T;
          } catch {
            CacheService.logger.warn(`Failed to parse cached data for ${cacheKey}, removing from cache`);
            await redisClient.del(cacheKey);
          }
        }
      } else {
        const cached = this.getMemoryCache(cache).get<T>(cacheKey);
        if (cached !== undefined) {
          CachePerformanceMetric.recordHit(cache, mode);
          return cached;
        }
      }

      CachePerformanceMetric.recordMiss(cache, mode);
      const data = await fetchFn();

      // Cache only when the fetch produced a concrete value (not `undefined` which is a "no result" signal).
      if (data !== undefined) {
        if (mode === "REDIS") {
          const result = await redisClient.set(
            cacheKey,
            stringify(data),
            "EX", // EX is used to set the TTL for the item
            this.CACHE_INFO[cache].ttl // The TTL of the item
          );
          if (result !== "OK") {
            throw new InternalServerError(`Failed to set cache for ${cacheKey}`);
          }
        } else {
          this.getMemoryCache(cache).set(cacheKey, data);
        }
      }

      return data;
    };

    const inFlightPromise = cacheAndReturn();
    this.inFlightRequests.set(inFlightKey, inFlightPromise);

    try {
      return (await inFlightPromise) as T;
    } finally {
      this.inFlightRequests.delete(inFlightKey);
    }
  }

  /**
   * Invalidates a cache key.
   *
   * @param cacheKey the key to invalidate
   */
  public static async invalidate(cacheKey: string): Promise<void> {
    await redisClient.del(cacheKey);
    for (const cache of this.memoryCaches.values()) {
      cache.remove(cacheKey);
    }
  }

  private static getMemoryCache(cacheId: CacheId): SSRCache {
    const existing = this.memoryCaches.get(cacheId);
    if (existing) {
      return existing;
    }

    const ttlMs = Math.max(0, this.CACHE_INFO[cacheId].ttl) * 1000;
    const created = new SSRCache({
      ttl: ttlMs,
    });
    this.memoryCaches.set(cacheId, created);
    return created;
  }
}
