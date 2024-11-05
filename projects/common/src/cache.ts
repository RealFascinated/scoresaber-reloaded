type DebugOptions = {
  added?: boolean;
  removed?: boolean;
  fetched?: boolean;
  expired?: boolean;
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
   * The objects that have been cached
   * @private
   */
  private cache = new Map<string, CachedObject>();

  constructor({ ttl, checkInterval, debug }: CacheOptions) {
    this.ttl = ttl;
    this.checkInterval = checkInterval || this.ttl ? 1000 * 60 : undefined; // 1 minute
    this.debug = debug || {
      expired: true,
    };

    if (this.ttl !== undefined && this.checkInterval !== undefined) {
      setInterval(() => {
        const before = this.cache.size;
        for (const [key, value] of this.cache.entries()) {
          if (value.timestamp + this.ttl! > Date.now()) {
            continue;
          }
          this.remove(key);
        }
        if (this.debug.expired) {
          console.log(
            `Expired ${before - this.cache.size} objects from cache (before: ${before}, after: ${this.cache.size})`
          );
        }
      }, this.checkInterval);
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
      if (this.debug) {
        console.log(`Cache miss for key: ${key}`);
      }
      return undefined;
    }
    if (this.debug.fetched) {
      console.log(`Retrieved ${key} from cache, value: ${JSON.stringify(cachedObject)}`);
    }
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
      console.log(`Inserted ${key} into cache, value: ${JSON.stringify(value)}`);
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
      console.log(`Removed ${key} from cache`);
    }
  }
}
