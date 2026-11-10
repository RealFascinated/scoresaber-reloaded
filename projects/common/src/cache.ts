type CacheOptions = {
  /**
   * The time (in ms) the cached object will be valid for
   */
  ttl?: number;

  checkInterval?: number;

  maxObjects?: number;
};

type CachedObject<TValue> = {
  value: TValue;

  timestamp: number;
};

/**
 * In-memory TTL cache. `TValue` is the type of the stored values; it defaults to `unknown` so existing
 * heterogeneous callers keep compiling, and `get<T>` remains an unchecked assertion for them.
 */
export class SSRCache<TValue = unknown> {
  private readonly ttl: number | undefined;

  private readonly checkInterval: number | undefined;

  private readonly maxObjects: number | undefined;

  private cache = new Map<string, CachedObject<TValue>>();
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

  public get<T extends TValue = TValue>(key: string): T | undefined {
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

  public set<T extends TValue>(key: string, value: T): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });

    if (this.maxObjects !== undefined && this.cache.size >= this.maxObjects) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.remove(oldestKey); // Remove the oldest object
      }
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

  private isExpired(cachedObject: CachedObject<TValue>): boolean {
    if (this.ttl === undefined) {
      return false;
    }
    return cachedObject.timestamp + this.ttl < Date.now();
  }
}
