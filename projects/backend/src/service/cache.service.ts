import { InternalServerError } from "@ssr/common/error/internal-server-error";
import Logger from "@ssr/common/logger";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { isProduction } from "@ssr/common/utils/utils";
import SuperJSON from "superjson";
import { redisClient } from "../common/redis";

export enum CacheId {
  BeatSaver = "beatSaver",
  ScoreSaber = "scoresaber",
  Leaderboards = "leaderboards",
  AdditionalScoreData = "additionalScoreData",
  Players = "players",
  ScoreStats = "scoreStats",
  PreviousScore = "previousScore",
}

export default class CacheService {
  public static readonly CACHE_EXPIRY = {
    [CacheId.BeatSaver]: TimeUnit.toSeconds(TimeUnit.Day, 7),
    [CacheId.ScoreSaber]: TimeUnit.toSeconds(TimeUnit.Minute, 5),
    [CacheId.Leaderboards]: TimeUnit.toSeconds(TimeUnit.Hour, 2),
    [CacheId.AdditionalScoreData]: TimeUnit.toSeconds(TimeUnit.Hour, 1),
    [CacheId.Players]: TimeUnit.toSeconds(TimeUnit.Minute, 30),
    [CacheId.ScoreStats]: TimeUnit.toSeconds(TimeUnit.Hour, 12),
    [CacheId.PreviousScore]: TimeUnit.toSeconds(TimeUnit.Hour, 1),
  };

  /**
   * Fetches data with caching. If the data is not in cache, the fetchFn is called and the data is cached.
   * If the data is in cache, it is returned immediately.
   *
   * @param cache the cache to fetch from
   * @param cacheKey the key used for caching.
   * @param fetchFn the function to fetch data if it's not in cache.
   */
  public static async fetchWithCache<T>(
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

    // const before = performance.now();
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      try {
        // Logger.debug(`[REDIS] Found ${cacheKey} in ${formatDuration(performance.now() - before)}`);
        return SuperJSON.parse(cachedData) as T;
      } catch {
        Logger.warn(`Failed to parse cached data for ${cacheKey}, removing from cache`);
        await redisClient.del(cacheKey);
      }
    }

    const data = await fetchFn();
    if (data) {
      const result = await redisClient.set(
        cacheKey,
        SuperJSON.stringify(data),
        "EX", // EX is used to set the TTL for the item
        this.CACHE_EXPIRY[cache] // The TTL of the item
      );
      if (result !== "OK") {
        throw new InternalServerError(`Failed to set cache for ${cacheKey}`);
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
  }
}
