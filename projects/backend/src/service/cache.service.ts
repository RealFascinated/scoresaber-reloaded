import { SSRCache } from "@ssr/common/cache";
import { InternalServerError } from "@ssr/common/error/internal-server-error";
import Logger from "@ssr/common/logger";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { isProduction } from "@ssr/common/utils/utils";
import { parse, stringify } from "devalue";
import { redisClient } from "../common/redis";

export enum CacheId {
  BeatSaver = "beatSaver",
  ScoreSaber = "scoresaber",
  ScoreSaberApi = "scoresaberApi",
  Leaderboards = "leaderboards",
  BeatLeaderScore = "beatLeaderScore",
  Players = "players",
  ScoreStats = "scoreStats",
  PreviousScore = "previousScore",
  ScoreHistoryGraph = "scoreHistoryGraph",
}

export type CacheMode = "REDIS" | "MEMORY";

export default class CacheService {
  private static readonly memoryCaches = new Map<CacheId, SSRCache>();

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
    [CacheId.Players]: {
      ttl: TimeUnit.toSeconds(TimeUnit.Minute, 30),
      mode: "REDIS",
    },
    [CacheId.ScoreStats]: {
      ttl: TimeUnit.toSeconds(TimeUnit.Hour, 12),
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
  public static async fetch<T>(
    cache: CacheId,
    cacheKey: string,
    fetchFn: () => Promise<T>
  ): Promise<T> {
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
    if (mode === "REDIS") {
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
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
    if (data) {
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
      // keep default check interval (60s) unless caller overrides in future
      debug: {},
    });
    this.memoryCaches.set(cacheId, created);
    return created;
  }
}
