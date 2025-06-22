import Logger from "@ssr/common/logger";
import { QueueId } from "./queue-manager";

export abstract class Queue<T> {
  /**
   * The name of the queue
   */
  public readonly id: QueueId;

  /**
   * The queue of items
   */
  private queue: T[] = [];

  /**
   * The lock for the queue
   */
  private lock = false;

  /**
   * Whether the queue is stopped
   */
  private isStopped = false;

  /**
   * Whether the queue should be saved
   * and loaded from the database
   */
  public readonly saveQueueToDatabase: boolean;

  constructor(id: QueueId, saveQueueToDatabase: boolean = false) {
    this.id = id;
    this.saveQueueToDatabase = saveQueueToDatabase;
  }

  /**
   * Adds an item to the queue
   *
   * @param item the item to add
   */
  public add(item: T) {
    if (this.isStopped) {
      return;
    }

    // If the item is already in the queue, don't add it again
    if (this.queue.includes(item)) {
      return;
    }

    this.queue.push(item);
    this.processQueue(); // Start processing immediately
  }

  /**
   * Adds multiple items to the queue
   *
   * @param items the items to add
   */
  public addAll(items: T[]) {
    if (this.isStopped) {
      return;
    }

    for (const item of items) {
      if (!this.queue.includes(item)) {
        this.queue.push(item);
      }
    }

    this.processQueue(); // Start processing immediately
  }

  /**
   * Processes the queue
   */
  private async processQueue() {
    // Don't process the queue if it's locked,
    // stopped, or we're not in production
    if (this.lock || this.isStopped || /*isProduction()*/ false) {
      return;
    }

    this.lock = true;
    try {
      const item = this.queue.shift();
      if (!item) {
        return;
      }

      await this.processItem(item);
    } catch (error) {
      Logger.error(`Error processing queue ${this.id}:`, error);
    } finally {
      this.lock = false;
      // If there are more items in the queue and we're not stopped, process the next one
      if (this.queue.length > 0 && !this.isStopped) {
        this.processQueue();
      }
    }
  }

  /**
   * Gets the queue items
   *
   * @returns the queue
   */
  public getQueue(): T[] {
    return this.queue;
  }

  /**
   * Gets the size of the queue
   *
   * @returns the size of the queue
   */
  public getSize(): number {
    return this.queue.length;
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
