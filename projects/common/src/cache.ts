import Logger from "./logger";

type DebugOptions = {
  added?: boolean;
  removed?: boolean;
  fetched?: boolean;
  expired?: boolean;
  missed?: boolean;
};

export type CacheStatistics = {
  /**
   * The size in bytes of the cache
   */
  size: number;

  /**
   * The number of objects in the cache
   */
  keys: number;

  /**
   * The number of cache hits
   */
  hits: number;

  /**
   * The number of cache misses
   */
  misses: number;

  /**
   * The number of expired objects
   */
  expired: number;

  /**
   * The percentage of cache hits
   */
  hitPercentage: number;
};

type CacheOptions = {
  /**
   * The time (in ms) the cached object will be valid for
   */
  ttl?: number;

  /**
   * How often to check for expired objects
   */
  checkInterval?: number;

  /**
   * Enable debug messages
   */
  debug?: DebugOptions;
};

type CachedObject = {
  /**
   * The cached object
   */
  value: any;

  /**
   * The timestamp the object was cached
   */
  timestamp: number;
};

export class SSRCache {
  /**
   * The time the cached object will be valid for
   * @private
   */
  private readonly ttl: number | undefined;

  /**
   * How often to check for expired objects
   * @private
   */
  private readonly checkInterval: number | undefined;

  /**
   * Enable debug messages
   * @private
   */
  private readonly debug: DebugOptions;

  /**
   * The number of cache hits
   * @private
   */
  private cacheHits: number = 0;

  /**
   * The number of cache misses
   * @private
   */
  private cacheMisses: number = 0;

  /**
   * The number of expired objects
   * @private
   */
  private expired: number = 0;

  /**
   * The objects that have been cached
   * @private
   */
  private cache = new Map<string, CachedObject>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor({ ttl, checkInterval, debug }: CacheOptions) {
    this.ttl = ttl;
    this.checkInterval = checkInterval || this.ttl ? 1000 * 60 : undefined; // 1 minute
    this.debug = debug || {};

    if (this.ttl !== undefined && this.checkInterval !== undefined) {
      this.cleanupInterval = setInterval(() => {
        const before = this.cache.size;
        for (const [key, value] of this.cache.entries()) {
          if (value.timestamp + this.ttl! < Date.now()) {
            this.expired++;
            this.remove(key);
          }
        }
        if (this.debug.expired) {
          Logger.info(
            `Expired ${before - this.cache.size} objects from cache (before: ${before}, after: ${this.cache.size})`
          );
        }
      }, this.checkInterval);
    }
  }

  public cleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Gets an object from the cache
   *
   * @param key the cache key for the object
   */
  public get<T>(key: string): T | undefined {
    const cachedObject = this.cache.get(key);
    if (cachedObject === undefined) {
      if (this.debug.missed) {
        Logger.info(`Cache miss for key: ${key}, total misses: ${this.cacheMisses}`);
      }
      this.cacheMisses++;
      return undefined;
    }
    if (this.debug.fetched) {
      Logger.info(`Retrieved ${key} from cache, total hits: ${this.cacheHits}`);
    }
    this.cacheHits++;
    return cachedObject.value as T;
  }

  /**
   * Sets an object in the cache
   *
   * @param key the cache key
   * @param value the object
   */
  public set<T>(key: string, value: T): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });

    if (this.debug.added) {
      Logger.info(
        `Inserted ${key} into cache, total keys: ${this.cache.size}, total hits: ${this.cacheHits}, total misses: ${this.cacheMisses}`
      );
    }
  }

  /**
   * Checks if an object is in the cache
   *
   * @param key the cache key
   */
  public has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Removes an object from the cache
   *
   * @param key the cache key
   */
  public remove(key: string): void {
    this.cache.delete(key);

    if (this.debug.removed) {
      Logger.info(`Removed ${key} from cache`);
    }
  }

  /**
   * Gets the cache statistics
   */
  public getStatistics(): CacheStatistics {
    return {
      size: Buffer.byteLength(JSON.stringify(Array.from(this.cache.entries())), "utf-8"),
      keys: this.cache.size,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      expired: this.expired,
      hitPercentage: this.cacheHits === 0 ? 0 : (this.cacheHits / (this.cacheHits + this.cacheMisses)) * 100,
    };
  }
}
