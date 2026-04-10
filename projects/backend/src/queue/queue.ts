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

  /**
   * Number of in-flight item processors
   */
  private activeWorkers = 0;

  /**
   * Whether the queue is stopped
   */
  private isStopped = false;

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

    await redisClient.lpush(`queue::${this.id}`, stringify(item));
    // Use setImmediate to ensure the item is committed before processing
    setImmediate(() => this.processQueue());
  }

  /**
   * Adds multiple items to the queue
   *
   * @param items the items to add
   */
  public async addAll(items: T[]) {
    if (this.isStopped) {
      return;
    }

    await redisClient.lpush(`queue::${this.id}`, stringify(items));
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

    while (this.activeWorkers < this.concurrency && !this.isStopped) {
      const rawItem =
        this.queueMode === "fifo"
          ? await redisClient.rpop(`queue::${this.id}`)
          : await redisClient.lpop(`queue::${this.id}`);

      if (!rawItem) {
        break;
      }

      this.activeWorkers++;
      void this.runOneItem(rawItem);
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
      queueLogger.error(`Error processing queue ${this.id}:`, error);
    } finally {
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
    return await redisClient.llen(`queue::${this.id}`);
  }

  public getActiveWorkers(): number {
    return this.activeWorkers;
  }

  public async hasItem(item: T): Promise<boolean> {
    return (await redisClient.lindex(`queue::${this.id}`, 0)) === stringify(item);
  }

  /**
   * Stops the queue
   */
  public stop() {
    this.isStopped = true;
  }

  /**
   * Processes an item in the queue
   *
   * @param item the item to process
   */
  protected abstract processItem(item: T): Promise<void>;
}
