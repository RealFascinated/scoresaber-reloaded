import Logger from "@ssr/common/logger";
import { QueueId } from "./queue-manager";

export abstract class Queue<T> {
  private readonly MAX_SAMPLES = 10;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isStopped = false;

  /**
   * The name of the queue
   */
  public readonly name: QueueId;

  /**
   * The queue of items
   */
  private queue: T[] = [];

  /**
   * The lock for the queue
   */
  private lock = false;

  /**
   * The timestamps of the items in the queue
   */
  private itemTimestamps: Map<T, number> = new Map();

  /**
   * The processing times of the items in the queue
   */
  private processingTimes: number[] = [];

  constructor(name: QueueId) {
    this.name = name;

    this.cleanupInterval = setInterval(() => {
      // Clean up timestamps for items that are no longer in the queue
      for (const [item] of this.itemTimestamps.entries()) {
        if (!this.queue.includes(item)) {
          this.itemTimestamps.delete(item);
        }
      }
      if (this.processingTimes.length > this.MAX_SAMPLES) {
        this.processingTimes = this.processingTimes.slice(-this.MAX_SAMPLES);
      }
    }, 30_000); // Clean up every 30 seconds
  }

  public cleanup() {
    Logger.info(`Cleaning up queue ${this.name}...`);
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.isStopped = true;
    Logger.info(`Queue ${this.name} stopped`);
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
    this.queue.push(item);
    this.itemTimestamps.set(item, Date.now());
    this.processQueue(); // Start processing immediately
  }

  /**
   * Gets the average time items spend in the queue
   *
   * @returns the average time in milliseconds
   */
  public getAverageTimeInQueue(): number {
    if (this.processingTimes.length === 0) return 0;
    return this.processingTimes.reduce((sum, time) => sum + time, 0) / this.processingTimes.length;
  }

  /**
   * Processes the queue
   */
  private async processQueue() {
    if (this.lock || this.isStopped) {
      return;
    }

    this.lock = true;
    try {
      const item = this.queue.shift();
      if (!item) {
        return;
      }

      const startTime = this.itemTimestamps.get(item);
      if (!startTime) {
        return;
      }

      this.itemTimestamps.delete(item);

      // Process the item and measure its processing time
      const processStartTime = Date.now();
      await this.processItem(item);
      const processingTime = Date.now() - processStartTime;

      // Add new processing time to the array
      this.processingTimes.push(processingTime);

      // Keep only the last MAX_SAMPLES items
      if (this.processingTimes.length > this.MAX_SAMPLES) {
        this.processingTimes.shift();
      }
    } catch (error) {
      Logger.error(`Error processing queue ${this.name}:`, error);
    } finally {
      this.lock = false;
      // If there are more items in the queue and we're not stopped, process the next one
      if (this.queue.length > 0 && !this.isStopped) {
        this.processQueue();
      }
    }
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
   * Processes an item in the queue
   *
   * @param item the item to process
   */
  protected abstract processItem(item: T): Promise<void>;
}
