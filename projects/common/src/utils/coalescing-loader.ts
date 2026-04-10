/**
 * Ensures at most one load runs per key at a time. Concurrent callers for the same
 * key share the same Promise (request coalescing).
 *
 * When a load completes (success or failure), the key is removed so future calls
 * perform a fresh load. Combine with a persistent cache if you want reuse across calls.
 */
export class CoalescingLoader<K, V> {
  private readonly inFlight = new Map<K, Promise<V>>();

  /**
   * Returns the value for the key, loading it via `loader` if necessary.
   * Concurrent calls for the same key share a single in-flight load.
   */
  public get(key: K, loader: () => Promise<V> | V): Promise<V> {
    const existing = this.inFlight.get(key);
    if (existing) {
      return existing;
    }

    const created = Promise.resolve().then(loader);
    this.inFlight.set(key, created);

    void created.finally(() => {
      // Only clear if this is still the active Promise for the key.
      if (this.inFlight.get(key) === created) {
        this.inFlight.delete(key);
      }
    });

    return created;
  }
}
