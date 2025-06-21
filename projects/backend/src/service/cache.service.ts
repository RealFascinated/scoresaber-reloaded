import { env } from "@ssr/common/env";
import { InternalServerError } from "@ssr/common/error/internal-server-error";
import Logger from "@ssr/common/logger";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { isProduction } from "@ssr/common/utils/utils";
import { RedisClient } from "bun";
import SuperJSON from "superjson";

export enum CacheId {
  BeatSaver = "beatSaver",
  AppStatistics = "appStatistics",
  ScoreSaber = "scoresaber",
  Leaderboards = "leaderboards",
  AdditionalScoreData = "additionalScoreData",
  Players = "players",
  ScoreStats = "scoreStats",
}

export default class CacheService {
  private static readonly cacheInfo = {
    [CacheId.BeatSaver]: TimeUnit.toSeconds(TimeUnit.Hour, 12),
    [CacheId.AppStatistics]: TimeUnit.toSeconds(TimeUnit.Hour, 1),
    [CacheId.ScoreSaber]: TimeUnit.toSeconds(TimeUnit.Minute, 1),
    [CacheId.Leaderboards]: TimeUnit.toSeconds(TimeUnit.Hour, 2),
    [CacheId.AdditionalScoreData]: TimeUnit.toSeconds(TimeUnit.Minute, 60),
    [CacheId.Players]: TimeUnit.toSeconds(TimeUnit.Minute, 5),
    [CacheId.ScoreStats]: TimeUnit.toSeconds(TimeUnit.Hour, 12),
  };

  private static readonly redisClient = new RedisClient(env.REDIS_URL);

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
    const cachedData = await this.redisClient.get(cacheKey);
    if (cachedData) {
      try {
        // Logger.debug(`[REDIS] Found ${cacheKey} in ${formatDuration(performance.now() - before)}`);
        return SuperJSON.parse(cachedData) as T;
      } catch {
        Logger.warn(`Failed to parse cached data for ${cacheKey}, removing from cache`);
        await this.redisClient.del(cacheKey);
      }
    }

    const data = await fetchFn();
    if (data) {
      const result = await this.redisClient.set(
        cacheKey,
        SuperJSON.stringify(data),
        "EX", // EX is used to set the TTL for the item
        this.cacheInfo[cache] // The TTL of the item
      );
      if (result !== "OK") {
        throw new InternalServerError(`Failed to set cache for ${cacheKey}`);
      }
    }

    return data;
  }
}
