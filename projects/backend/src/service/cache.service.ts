import { CacheStatistics, SSRCache } from "@ssr/common/cache";
import Logger from "@ssr/common/logger";
import { TimeUnit } from "@ssr/common/utils/time-utils";

export enum ServiceCache {
  BeatSaver = "beatSaver",
  AppStatistics = "appStatistics",
  ScoreSaber = "scoresaber",
  Leaderboards = "leaderboards",
  ScoreCalendar = "scoreCalendar",
  AdditionalScoreData = "additionalScoreData",
  Players = "players",
  ScoreStats = "scoreStats",
}

export default class CacheService {
  /**
   * The caches to use for the service
   */
  private static readonly caches = new Map<ServiceCache, SSRCache>();

  constructor() {
    const cacheInfo = {
      [ServiceCache.BeatSaver]: {
        ttl: TimeUnit.toMillis(TimeUnit.Hour, 2), // 2 hours
      },
      [ServiceCache.AppStatistics]: {
        ttl: TimeUnit.toMillis(TimeUnit.Hour, 1), // 1 hour
      },
      [ServiceCache.ScoreSaber]: {
        ttl: TimeUnit.toMillis(TimeUnit.Minute, 1),
      },
      [ServiceCache.Leaderboards]: {
        ttl: TimeUnit.toMillis(TimeUnit.Hour, 2),
      },
      [ServiceCache.ScoreCalendar]: {
        ttl: TimeUnit.toMillis(TimeUnit.Minute, 30),
      },
      [ServiceCache.AdditionalScoreData]: {
        ttl: TimeUnit.toMillis(TimeUnit.Minute, 30),
      },
      [ServiceCache.Players]: {
        ttl: TimeUnit.toMillis(TimeUnit.Minute, 5),
      },
      [ServiceCache.ScoreStats]: {
        ttl: TimeUnit.toMillis(TimeUnit.Hour, 3),
      },
    };

    for (const [cache, info] of Object.entries(cacheInfo)) {
      CacheService.caches.set(cache as ServiceCache, new SSRCache(info));
    }

    Logger.info(
      `[CacheService] ${CacheService.caches.size} Caches: ${Array.from(CacheService.caches.keys()).join(", ")}`
    );
  }

  /**
   * Gets a cache
   *
   * @param cache the cache to get
   * @returns the cache
   */
  public static getCache(cache: ServiceCache): SSRCache {
    return CacheService.caches.get(cache)!;
  }

  /**
   * Gets the cache statistics for all caches
   */
  public static getCacheStatistics(): { [cache: string]: CacheStatistics } {
    const statistics: { [cache: string]: CacheStatistics } = {};
    for (const [cache, cacheService] of CacheService.caches) {
      statistics[cache] = cacheService.getStatistics();
    }
    return statistics;
  }
}
