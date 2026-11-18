import { SSRCache } from "@ssr/common/cache";
import { InternalServerError } from "@ssr/common/error/internal-server-error";
import Logger, { type ScopedLogger } from "@ssr/common/logger";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { isProduction } from "@ssr/common/utils/utils";
import { parse, stringify } from "devalue";
import { redisClient } from "../../common/redis";
import CachePerformanceMetric from "../../metrics/impl/backend/cache-performance";

export enum CacheId {
  PLAYER_HMD_BREAKDOWN = "player_hmd_breakdown",
  PLAYER_PPS = "player_pps",
  PLAYER_SCORE_STATISTICS = "player_score_statistics",
  BEATSAVER_MAP = "beatsaver_map",
  SCORESABER_PLAYER = "scoresaber_player",
  SCORESABER_MINI_RANKING = "scoresaber_mini_ranking",
  SCORESABER_MINI_RANKING_RESPONSE = "scoresaber_mini_ranking_response",
  SCORESABER_API_RESPONSE = "scoresaber_api_response",
  SCORESABER_LEADERBOARD_STAR_CHANGE = "scoresaber_leaderboard_star_change",
  SCORESABER_RANKED_BATCH_MARKERS = "scoresaber_ranked_batch_markers",
  SCORESABER_RANKING_QUEUE_LEADERBOARDS = "scoresaber_ranking_queue_leaderboards",
  SCORESABER_REALMS = "scoresaber_realms",
  SCORESABER_REALM_PP_CURVE = "scoresaber_realm_pp_curve",
  BEATLEADER_SCORE = "beatleader_score",
  SCORESABER_SCORE_HISTORY_GRAPH = "scoresaber_score_history_graph",
}

export type CacheMode = "REDIS" | "MEMORY";

export default class CacheService {
  private static readonly logger: ScopedLogger = Logger.withTopic("Cache");
  private static readonly memoryCaches = new Map<CacheId, SSRCache>();
  private static readonly inFlightRequests = new Map<string, Promise<unknown>>();

  public static readonly CACHE_INFO: Record<CacheId, { ttl: number; mode: CacheMode; negativeTtl?: number }> =
    {
      [CacheId.PLAYER_HMD_BREAKDOWN]: {
        ttl: TimeUnit.toSeconds(TimeUnit.Hour, 1),
        mode: "MEMORY",
      },
      [CacheId.PLAYER_PPS]: {
        ttl: TimeUnit.toSeconds(TimeUnit.Hour, 1),
        mode: "MEMORY",
      },
      [CacheId.PLAYER_SCORE_STATISTICS]: {
        ttl: TimeUnit.toSeconds(TimeUnit.Hour, 1),
        mode: "MEMORY",
      },
      [CacheId.SCORESABER_MINI_RANKING]: {
        ttl: TimeUnit.toSeconds(TimeUnit.Minute, 2),
        mode: "MEMORY",
      },
      [CacheId.SCORESABER_MINI_RANKING_RESPONSE]: {
        ttl: TimeUnit.toSeconds(TimeUnit.Minute, 1),
        mode: "MEMORY",
      },
      [CacheId.SCORESABER_API_RESPONSE]: {
        ttl: TimeUnit.toSeconds(TimeUnit.Minute, 2),
        mode: "MEMORY",
      },
      [CacheId.SCORESABER_LEADERBOARD_STAR_CHANGE]: {
        ttl: TimeUnit.toSeconds(TimeUnit.Hour, 1),
        mode: "MEMORY",
      },
      [CacheId.SCORESABER_RANKED_BATCH_MARKERS]: {
        ttl: TimeUnit.toSeconds(TimeUnit.Hour, 1),
        mode: "MEMORY",
      },
      [CacheId.SCORESABER_RANKING_QUEUE_LEADERBOARDS]: {
        ttl: TimeUnit.toSeconds(TimeUnit.Hour, 2),
        mode: "MEMORY",
      },

      [CacheId.SCORESABER_REALMS]: {
        ttl: TimeUnit.toSeconds(TimeUnit.Hour, 1),
        mode: "MEMORY",
      },
      [CacheId.SCORESABER_REALM_PP_CURVE]: {
        ttl: TimeUnit.toSeconds(TimeUnit.Hour, 1),
        mode: "MEMORY",
      },

      [CacheId.SCORESABER_PLAYER]: {
        ttl: TimeUnit.toSeconds(TimeUnit.Day, 7),
        mode: "REDIS",
      },
      [CacheId.BEATSAVER_MAP]: {
        ttl: TimeUnit.toSeconds(TimeUnit.Day, 7),
        mode: "REDIS",
      },
      [CacheId.BEATLEADER_SCORE]: {
        ttl: TimeUnit.toSeconds(TimeUnit.Hour, 1),
        negativeTtl: TimeUnit.toSeconds(TimeUnit.Minute, 1),
        mode: "REDIS",
      },
      [CacheId.SCORESABER_SCORE_HISTORY_GRAPH]: {
        ttl: TimeUnit.toSeconds(TimeUnit.Hour, 1),
        mode: "REDIS",
      },
    };

  public static async get<T>(cache: CacheId, cacheKey: string) {
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

  public static async insert<T>(cache: CacheId, cacheKey: string, data: T) {
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
  public static async fetch<T>(cache: CacheId, cacheKey: string, fetchFn: () => Promise<T>) {
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
        let cachedData: string | null = null;
        try {
          cachedData = await redisClient.get(cacheKey);
        } catch (error) {
          CacheService.logger.warn(`Failed to read ${cacheKey} from Redis:`, error);
        }
        if (cachedData !== null) {
          try {
            const parsed = parse(cachedData) as T;
            CachePerformanceMetric.recordHit(cache, mode);
            return parsed;
          } catch {
            CacheService.logger.warn(`Failed to parse cached data for ${cacheKey}, removing from cache`);
            await redisClient.del(cacheKey).catch(() => undefined);
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

      const negativeTtl = this.CACHE_INFO[cache].negativeTtl;
      if (data === undefined && mode === "REDIS" && negativeTtl !== undefined) {
        try {
          await redisClient.set(cacheKey, stringify(undefined), "EX", negativeTtl);
        } catch (error) {
          CacheService.logger.warn(`Failed to write negative ${cacheKey} to Redis:`, error);
        }
      }
      if (data !== undefined) {
        if (mode === "REDIS") {
          try {
            const result = await redisClient.set(cacheKey, stringify(data), "EX", this.CACHE_INFO[cache].ttl);
            if (result !== "OK") {
              CacheService.logger.warn(`Failed to set cache for ${cacheKey}`);
            }
          } catch (error) {
            CacheService.logger.warn(`Failed to write ${cacheKey} to Redis:`, error);
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
   * Batch variant of {@link fetch}: reads every key with one round trip and loads only the missing ones
   * through a single call, so a page of N lookups costs one cache read and one loader call instead of N each.
   *
   * @param cache the cache to fetch from
   * @param cacheKeys the keys to look up, duplicates are fine
   * @param loadMissing loads the values of the missing keys; keys it leaves out are treated as `undefined`
   * @returns the value of every requested key, `undefined` when none exists
   */
  public static async fetchMany<T>(
    cache: CacheId,
    cacheKeys: string[],
    loadMissing: (missingKeys: string[]) => Promise<Map<string, T | undefined>>
  ) {
    const uniqueKeys = [...new Set(cacheKeys)];
    const values = new Map<string, T | undefined>();
    if (uniqueKeys.length === 0) {
      return values;
    }
    if (!isProduction()) {
      const loaded = await loadMissing(uniqueKeys);
      return new Map(uniqueKeys.map(key => [key, loaded.get(key)]));
    }

    const { mode, ttl, negativeTtl } = this.CACHE_INFO[cache];
    const missing: string[] = [];

    if (mode === "REDIS") {
      let cachedValues: (string | null)[] = uniqueKeys.map(() => null);
      try {
        cachedValues = await redisClient.mget(uniqueKeys);
      } catch (error) {
        CacheService.logger.warn(`Failed to read ${uniqueKeys.length} keys from Redis:`, error);
      }
      uniqueKeys.forEach((key, index) => {
        const cachedData = cachedValues[index];
        if (cachedData !== null) {
          try {
            values.set(key, parse(cachedData) as T | undefined);
            CachePerformanceMetric.recordHit(cache, mode);
            return;
          } catch {
            CacheService.logger.warn(`Failed to parse cached data for ${key}`);
          }
        }
        CachePerformanceMetric.recordMiss(cache, mode);
        missing.push(key);
      });
    } else {
      const memoryCache = this.getMemoryCache(cache);
      for (const key of uniqueKeys) {
        const cached = memoryCache.get<T>(key);
        if (cached !== undefined) {
          CachePerformanceMetric.recordHit(cache, mode);
          values.set(key, cached);
        } else {
          CachePerformanceMetric.recordMiss(cache, mode);
          missing.push(key);
        }
      }
    }

    if (missing.length === 0) {
      return values;
    }

    const loaded = await loadMissing(missing);
    const pipeline = mode === "REDIS" ? redisClient.pipeline() : undefined;
    for (const key of missing) {
      const value = loaded.get(key);
      values.set(key, value);
      if (value !== undefined) {
        if (pipeline) {
          pipeline.set(key, stringify(value), "EX", ttl);
        } else {
          this.getMemoryCache(cache).set(key, value);
        }
      } else if (pipeline && negativeTtl !== undefined) {
        pipeline.set(key, stringify(undefined), "EX", negativeTtl);
      }
    }
    if (pipeline && pipeline.length > 0) {
      try {
        await pipeline.exec();
      } catch (error) {
        CacheService.logger.warn(`Failed to write ${missing.length} keys to Redis:`, error);
      }
    }

    return values;
  }

  /**
   * Invalidates a cache key.
   *
   * @param cacheKey the key to invalidate
   */
  public static async invalidate(cacheKey: string) {
    await redisClient.del(cacheKey);
    for (const cache of this.memoryCaches.values()) {
      cache.remove(cacheKey);
    }
  }

  /**
   * Invalidates one in-memory entry of one cache. Prefer this over {@link invalidateMemoryPrefix} when the
   * exact key is known: the prefix variant walks every key of every memory cache.
   *
   * @param cache the cache holding the entry
   * @param cacheKey the key to invalidate
   */
  public static invalidateMemoryKey(cache: CacheId, cacheKey: string) {
    this.memoryCaches.get(cache)?.remove(cacheKey);
  }

  /**
   * Invalidates every in-memory entry whose key starts with the prefix. Use this instead of
   * {@link invalidatePrefix} for caches that only live in memory: it never touches Redis, whereas
   * `invalidatePrefix` walks Redis's whole keyspace with SCAN, which is wasted work (and a lot of it
   * on a large keyspace) when nothing is stored there.
   *
   * @param prefix the key prefix to invalidate
   */
  public static invalidateMemoryPrefix(prefix: string) {
    for (const cache of this.memoryCaches.values()) {
      cache.removeMatching(key => key.startsWith(prefix));
    }
  }

  /**
   * Invalidates every entry, in memory or in Redis, whose key starts with the prefix.
   *
   * @param prefix the key prefix to invalidate
   */
  public static async invalidatePrefix(prefix: string) {
    for (const cache of this.memoryCaches.values()) {
      cache.removeMatching(key => key.startsWith(prefix));
    }

    const globPrefix = prefix.replace(/[*?[\]\\]/g, "\\$&");
    let cursor = "0";
    do {
      const [nextCursor, keys] = await redisClient.scan(cursor, "MATCH", `${globPrefix}*`, "COUNT", 500);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
      cursor = nextCursor;
    } while (cursor !== "0");
  }

  private static getMemoryCache(cacheId: CacheId) {
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
