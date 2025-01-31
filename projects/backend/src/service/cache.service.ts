import { CacheStatistics, SSRCache } from "@ssr/common/cache";

export enum ServiceCache {
  BeatSaver = "beatSaver",
  AppStatistics = "appStatistics",
  ScoreSaber = "scoresaber",
  Leaderboards = "leaderboards",
  PlayerScores = "playerScores",
  LeaderboardScores = "leaderboardScores",
  FriendScores = "friendScores",
  ScoreCalendar = "scoreCalendar",
  PPBoundary = "ppBoundary",
  AdditionalScoreData = "additionalScoreData",
  Playlists = "playlists",
}

export default class CacheService {
  /**
   * The caches to use for the service
   */
  private static readonly caches = new Map<ServiceCache, SSRCache>();

  constructor() {
    const cacheInfo = {
      [ServiceCache.BeatSaver]: {
        ttl: 1000 * 60 * 60 * 12, // 12 hours
      },
      [ServiceCache.AppStatistics]: {
        ttl: 1000 * 60 * 60, // 1 hour
      },
      [ServiceCache.ScoreSaber]: {
        ttl: 1000 * 60, // 1 minute
      },
      [ServiceCache.Leaderboards]: {
        ttl: 1000 * 60 * 10, // 10 minutes
      },
      [ServiceCache.PlayerScores]: {
        ttl: 1000 * 60, // 1 minute
      },
      [ServiceCache.LeaderboardScores]: {
        ttl: 1000 * 60, // 1 minute
      },
      [ServiceCache.FriendScores]: {
        ttl: 1000 * 60 * 5, // 5 minute
      },
      [ServiceCache.ScoreCalendar]: {
        ttl: 1000 * 60 * 30, // 30 minutes
      },
      [ServiceCache.PPBoundary]: {
        ttl: 1000 * 60 * 2, // 2 minutes
      },
      [ServiceCache.AdditionalScoreData]: {
        ttl: 1000 * 60 * 30, // 30 minutes
      },
      [ServiceCache.Playlists]: {
        ttl: 1000 * 60 * 60, // 1 hour
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
