import Logger from "@ssr/common/logger";
import { isProduction } from "@ssr/common/utils/utils";
import SuperJSON from "superjson";
import { redisClient } from "../common/redis";
import { QueueId } from "./queue-manager";

export type QueueItem<T> = {
  id: string;
  data: T;
};

export abstract class Queue<T> {
  /**
   * The name of the queue
   */
  public readonly id: QueueId;

  /**
   * The mode of the queue
   */
  public queueMode: "fifo" | "lifo" = "lifo";

  /**
   * The lock for the queue
   */
  private lock = false;

  /**
   * Whether the queue is stopped
   */
  private isStopped = false;

  constructor(id: QueueId, queueMode: "fifo" | "lifo" = "lifo") {
    this.id = id;
    this.queueMode = queueMode;
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

    await redisClient.lpush(`queue::${this.id}`, SuperJSON.stringify(item));
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

    await redisClient.lpush(`queue::${this.id}`, SuperJSON.stringify(items));
    // Use setImmediate to ensure the items are committed before processing
    setImmediate(() => this.processQueue());
  }

  /**
   * Processes the queue
   */
  public async processQueue() {
    // Don't process the queue if it's locked,
    // stopped, or we're not in production
    if (this.lock || this.isStopped || !isProduction()) {
      return;
    }

    this.lock = true;
    try {
      // Get the next item from the queue using proper Redis commands
      const rawItem =
        this.queueMode === "fifo"
          ? await redisClient.rpop(`queue::${this.id}`)
          : await redisClient.lpop(`queue::${this.id}`);

      if (!rawItem) {
        // No items in the queue, stop processing
        return;
      }

      const item = SuperJSON.parse(rawItem) as T;
      if (!item) {
        Logger.info(`Invalid queue item found in the queue ${this.id}: ${rawItem}`);
        this.processQueue(); // Keep going
        return;
      }

      await this.processItem(item);
    } catch (error) {
      Logger.error(`Error processing queue ${this.id}:`, error);
    } finally {
      this.lock = false;
      // If there are more items in the queue and we're not stopped, process the next one
      const queueSize = await this.getSize();
      if (queueSize > 0 && !this.isStopped) {
        this.processQueue();
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
