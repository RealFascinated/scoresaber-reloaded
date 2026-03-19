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
   * The maximum number of objects to cache
   */
  maxObjects?: number;
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
   * The maximum number of objects to cache
   * @private
   */
  private readonly maxObjects: number | undefined;

  /**
   * The objects that have been cached
   * @private
   */
  private cache = new Map<string, CachedObject>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor({ ttl, checkInterval, maxObjects }: CacheOptions) {
    this.ttl = ttl;
    this.checkInterval = checkInterval ?? (this.ttl !== undefined ? 1000 * 60 : undefined); // 1 minute
    this.maxObjects = maxObjects;

    if (this.ttl !== undefined && this.checkInterval !== undefined) {
      this.cleanupInterval = setInterval(() => {
        for (const [key, value] of this.cache.entries()) {
          if (this.ttl !== undefined && value.timestamp + this.ttl < Date.now()) {
            this.remove(key);
          }
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
      return undefined;
    }
    if (this.isExpired(cachedObject)) {
      this.remove(key);
      return undefined;
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

    if (this.maxObjects !== undefined && this.cache.size >= this.maxObjects) {
      this.remove(Array.from(this.cache.keys())[0]); // Remove the oldest object
    }
  }

  /**
   * Checks if an object is in the cache
   *
   * @param key the cache key
   */
  public has(key: string): boolean {
    const cachedObject = this.cache.get(key);
    if (cachedObject === undefined) {
      return false;
    }
    if (this.isExpired(cachedObject)) {
      this.remove(key);
      return false;
    }
    return true;
  }

  /**
   * Removes an object from the cache
   *
   * @param key the cache key
   */
  public remove(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Cleans up the cache
   */
  public cleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Checks if an object is expired
   *
   * @param cachedObject the cached object
   * @returns true if the object is expired, false otherwise
   */
  private isExpired(cachedObject: CachedObject): boolean {
    if (this.ttl === undefined) {
      return false;
    }
    return cachedObject.timestamp + this.ttl < Date.now();
  }
}
