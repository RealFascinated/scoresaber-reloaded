import { SSRCache } from "@ssr/common/cache";
import { InternalServerError } from "@ssr/common/error/internal-server-error";
import Logger from "@ssr/common/logger";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { isProduction } from "@ssr/common/utils/utils";
import { parse, stringify } from "devalue";
import { redisClient } from "../../common/redis";

export enum CacheId {
  BeatSaver = "beatSaver",
  ScoreSaber = "scoresaber",
  ScoreSaberApi = "scoresaberApi",
  Leaderboards = "leaderboards",
  BeatLeaderScore = "beatLeaderScore",
  PreviousScore = "previousScore",
  ScoreHistoryGraph = "scoreHistoryGraph",
}

export type CacheMode = "REDIS" | "MEMORY";

export default class CacheService {
  private static readonly memoryCaches = new Map<CacheId, SSRCache>();
  /**
   * In-flight request coalescing per cache key.
   * Prevents cache stampedes under concurrent load for the same missing key.
   */
  private static readonly inFlightRequests = new Map<string, Promise<unknown>>();

  public static readonly CACHE_INFO: Record<CacheId, { ttl: number; mode: CacheMode }> = {
    // Memory caches
    [CacheId.ScoreSaber]: {
      ttl: TimeUnit.toSeconds(TimeUnit.Minute, 2),
      mode: "MEMORY",
    },
    [CacheId.ScoreSaberApi]: {
      ttl: TimeUnit.toSeconds(TimeUnit.Minute, 2),
      mode: "MEMORY",
    },
    [CacheId.Leaderboards]: {
      ttl: TimeUnit.toSeconds(TimeUnit.Hour, 2),
      mode: "MEMORY",
    },

    // Redis caches
    [CacheId.BeatSaver]: {
      ttl: TimeUnit.toSeconds(TimeUnit.Day, 7),
      mode: "REDIS",
    },
    [CacheId.BeatLeaderScore]: {
      ttl: TimeUnit.toSeconds(TimeUnit.Hour, 1),
      mode: "REDIS",
    },
    [CacheId.PreviousScore]: {
      ttl: TimeUnit.toSeconds(TimeUnit.Hour, 1),
      mode: "REDIS",
    },
    [CacheId.ScoreHistoryGraph]: {
      ttl: TimeUnit.toSeconds(TimeUnit.Hour, 1),
      mode: "REDIS",
    },
  };
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
            return parse(cachedData) as T;
          } catch {
            Logger.warn(`Failed to parse cached data for ${cacheKey}, removing from cache`);
            await redisClient.del(cacheKey);
          }
        }
      } else {
        const cached = this.getMemoryCache(cache).get<T>(cacheKey);
        if (cached !== undefined) {
          return cached;
        }
      }

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
