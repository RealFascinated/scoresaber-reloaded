/**
 * Collects `load` calls made in the same tick and resolves them with a single `batchFn` call, so a page of
 * N items costs one query instead of N.
 */
export class BatchLoader<K, V> {
  private queue: { key: K; resolve: (value: V) => void; reject: (error: Error) => void }[] = [];

  constructor(
    private readonly batchFn: (keys: K[]) => Promise<V[]>,
    private readonly maxBatchSize: number = 200
  ) {}

  public load(key: K): Promise<V> {
    return new Promise<V>((resolve, reject) => {
      this.queue.push({ key, resolve, reject });
      if (this.queue.length === 1) {
        queueMicrotask(() => void this.flush());
      }
    });
  }

  private async flush(): Promise<void> {
    const pending = this.queue.splice(0);
    const batches: (typeof pending)[] = [];
    for (let i = 0; i < pending.length; i += this.maxBatchSize) {
      batches.push(pending.slice(i, i + this.maxBatchSize));
    }
    await Promise.all(
      batches.map(async batch => {
        try {
          const values = await this.batchFn(batch.map(item => item.key));
          batch.forEach((item, index) => item.resolve(values[index]));
        } catch (error) {
          const failure = error instanceof Error ? error : new Error(String(error));
          batch.forEach(item => item.reject(failure));
        }
      })
    );
  }
}
