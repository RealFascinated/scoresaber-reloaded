import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { parse, stringify } from "devalue";
import { redisClient } from "../common/redis";
import { QueueId } from "./queue-manager";

const queueLogger = Logger.withTopic("Queue");

export type QueueItem<T> = {
  id: string;
  data: T;
};
type QueueMode = "fifo" | "lifo";
export type QueueProcessEvent = {
  queueId: string;
  durationMs: number;
  success: boolean;
};

export abstract class Queue<T> {
  private static processObserver: ((event: QueueProcessEvent) => void) | undefined;
  /**
   * The name of the queue
   */
  public readonly id: QueueId;

  /**
   * The mode of the queue
   */
  public queueMode: QueueMode = "lifo";

  /**
   * Max concurrent workers processing items from this queue
   */
  public readonly concurrency: number;

  /** Max items pushed to Redis per command when adding a batch. */
  private static readonly ADD_BATCH_SIZE = 1_000;

  /**
   * Number of in-flight item processors
   */
  private activeWorkers = 0;

  /**
   * Whether the queue is stopped
   */
  private isStopped = false;

  /**
   * Whether items left in the processing list by a previous run were put back on the queue
   */
  private recoveredInFlight = false;

  constructor(id: QueueId, queueMode: QueueMode = "lifo", concurrency: number = 1) {
    this.id = id;
    this.queueMode = queueMode;
    this.concurrency = Math.max(1, Math.floor(concurrency));
  }

  public static setProcessObserver(observer: ((event: QueueProcessEvent) => void) | undefined): void {
    Queue.processObserver = observer;
  }

  /**
   * Adds an item to the queue
   *
   * @param item the item to add
   */
  public async add(item: T) {
    if (this.isStopped) {
      return;
    }

    await redisClient.lpush(this.queueKey, stringify(item));
    // Use setImmediate to ensure the item is committed before processing
    setImmediate(() => this.processQueue());
  }

  /**
   * Adds multiple items to the queue
   *
   * @param items the items to add
   */
  public async addAll(items: T[]) {
    if (this.isStopped || items.length === 0) {
      return;
    }

    // Pushed in batches: a seed queue takes hundreds of thousands of ids, and a round
    // trip per item kept it filling for longer than a processing cycle.
    for (let i = 0; i < items.length; i += Queue.ADD_BATCH_SIZE) {
      const entries = items.slice(i, i + Queue.ADD_BATCH_SIZE).map(item => stringify(item));
      await redisClient.lpush(this.queueKey, ...entries);
    }

    // Use setImmediate to ensure the items are committed before processing
    setImmediate(() => this.processQueue());
  }

  /**
   * Processes the queue
   */
  public async processQueue() {
    if (!env.ENABLE_QUEUES || this.isStopped) {
      return;
    }

    try {
      await this.recoverInFlightItems();
    } catch (error) {
      this.recoveredInFlight = false;
      queueLogger.error(`Failed to recover in-flight items for queue ${this.id}:`, error);
      return;
    }

    while (this.activeWorkers < this.concurrency && !this.isStopped) {
      // Reserve the worker slot before awaiting the pop so concurrent callers can't exceed the limit
      this.activeWorkers++;

      let rawItem: string | null;
      try {
        // The item moves to a processing list and is only removed once handled, so a crash doesn't lose it
        rawItem =
          this.queueMode === "fifo"
            ? await redisClient.lmove(this.queueKey, this.processingKey, "RIGHT", "LEFT")
            : await redisClient.lmove(this.queueKey, this.processingKey, "LEFT", "LEFT");
      } catch (error) {
        this.activeWorkers--;
        queueLogger.error(`Failed to pop an item from queue ${this.id}:`, error);
        break;
      }

      if (!rawItem) {
        this.activeWorkers--;
        break;
      }

      void this.runOneItem(rawItem);
    }
  }

  private get queueKey(): string {
    return `queue::${this.id}`;
  }

  private get processingKey(): string {
    return `queue::${this.id}::processing`;
  }

  /**
   * Puts items that were being processed when the previous process stopped back on the queue.
   */
  private async recoverInFlightItems(): Promise<void> {
    if (this.recoveredInFlight) {
      return;
    }
    this.recoveredInFlight = true;

    let recovered = 0;
    while ((await redisClient.lmove(this.processingKey, this.queueKey, "RIGHT", "LEFT")) !== null) {
      recovered++;
    }
    if (recovered > 0) {
      queueLogger.info(`Recovered ${recovered} in-flight items for queue ${this.id}`);
    }
  }

  private async runOneItem(rawItem: string): Promise<void> {
    try {
      const item = parse(rawItem) as T;
      if (!item) {
        queueLogger.info(`Invalid queue item found in the queue ${this.id}: ${rawItem}`);
        return;
      }

      const startedAt = performance.now();
      let success = false;
      try {
        await this.processItem(item);
        success = true;
      } finally {
        Queue.processObserver?.({
          queueId: this.id,
          durationMs: Math.max(0, performance.now() - startedAt),
          success,
        });
      }
    } catch (error) {
      queueLogger.error(`Error processing queue ${this.id}: dropped item ${rawItem}`, error);
    } finally {
      try {
        await redisClient.lrem(this.processingKey, 1, rawItem);
      } catch (error) {
        queueLogger.error(`Failed to clear in-flight item from queue ${this.id}:`, error);
      }
      this.activeWorkers--;
      if (!this.isStopped) {
        void this.processQueue();
      }
    }
  }

  /**
   * Gets the size of the queue
   *
   * @returns the size of the queue
   */
  public async getSize(): Promise<number> {
    return await redisClient.llen(this.queueKey);
  }

  public getActiveWorkers(): number {
    return this.activeWorkers;
  }

  public async hasItem(item: T): Promise<boolean> {
    const serialized = stringify(item);
    const [queued, inFlight] = await Promise.all([
      redisClient.lpos(this.queueKey, serialized),
      redisClient.lpos(this.processingKey, serialized),
    ]);
    return queued !== null || inFlight !== null;
  }

  /**
   * Stops the queue and waits (up to the timeout) for in-flight items to finish
   *
   * @param timeoutMs the max time to wait for the workers
   */
  public async stop(timeoutMs: number = 5_000): Promise<void> {
    this.isStopped = true;

    const deadline = Date.now() + timeoutMs;
    while (this.activeWorkers > 0 && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  /**
   * Processes an item in the queue
   *
   * @param item the item to process
   */
  protected abstract processItem(item: T): Promise<void>;
}
