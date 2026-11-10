type CacheOptions = {
  /**
   * The time (in ms) the cached object will be valid for
   */
  ttl?: number;

  checkInterval?: number;

  maxObjects?: number;
};

type CachedObject = {
  value: any;

  timestamp: number;
};

export class SSRCache {
  private readonly ttl: number | undefined;

  private readonly checkInterval: number | undefined;

  private readonly maxObjects: number | undefined;

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

  public set<T>(key: string, value: T): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });

    if (this.maxObjects !== undefined && this.cache.size >= this.maxObjects) {
      this.remove(Array.from(this.cache.keys())[0]); // Remove the oldest object
    }
  }

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

  public remove(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Removes every object whose key matches the predicate
   */
  public removeMatching(predicate: (key: string) => boolean): void {
    for (const key of this.cache.keys()) {
      if (predicate(key)) {
        this.cache.delete(key);
      }
    }
  }

  public cleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  private isExpired(cachedObject: CachedObject): boolean {
    if (this.ttl === undefined) {
      return false;
    }
    return cachedObject.timestamp + this.ttl < Date.now();
  }
}
