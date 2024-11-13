import { CacheStatistics, SSRCache } from "@ssr/common/cache";

export enum ServiceCache {
  BeatSaver = "beatSaver",
  AppStatistics = "appStatistics",
  ImageUtils = "imageUtils",
  ScoreSaber = "scoresaber",
  Leaderboards = "leaderboards",
  PlayerScores = "playerScores",
  LeaderboardScores = "leaderboardScores",
  FriendScores = "friendScores",
  ScoreCalendar = "scoreCalendar",
  PPBoundary = "ppBoundary",
}

export default class CacheService {
  /**
   * The caches to use for the service
   */
  private static readonly caches = new Map<ServiceCache, SSRCache>();

  constructor() {
    const cacheInfo = {
      [ServiceCache.BeatSaver]: {
        ttl: 1000 * 60 * 60 * 24, // 1 day
      },
      [ServiceCache.AppStatistics]: {
        ttl: 1000 * 60 * 60, // 1 hour
      },
      [ServiceCache.ImageUtils]: {
        ttl: 1000 * 60 * 60 * 24, // 24 hours
      },
      [ServiceCache.ScoreSaber]: {
        ttl: 1000 * 60, // 1 minute
      },
      [ServiceCache.Leaderboards]: {
        ttl: 1000 * 60 * 60, // 1 hour
      },
      [ServiceCache.PlayerScores]: {
        ttl: 1000 * 60, // 1 minute
      },
      [ServiceCache.LeaderboardScores]: {
        ttl: 1000 * 60, // 1 minute
      },
      [ServiceCache.FriendScores]: {
        ttl: 1000 * 60, // 1 minute
      },
      [ServiceCache.ScoreCalendar]: {
        ttl: 1000 * 60 * 60, // 1 hour
      },
      [ServiceCache.PPBoundary]: {
        ttl: 1000 * 60 * 30, // 30 minutes
      },
    };

    for (const [cache, info] of Object.entries(cacheInfo)) {
      CacheService.caches.set(cache as ServiceCache, new SSRCache(info));
    }

    console.log(
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
