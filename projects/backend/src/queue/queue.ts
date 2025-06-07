import { QueueName } from "./queue-manager";

export abstract class Queue<T> {
  private readonly MAX_SAMPLES = 10;

  /**
   * The name of the queue
   */
  public readonly name: QueueName;

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

  constructor(name: QueueName, interval: number = 30_000) {
    this.name = name;
    setInterval(() => this.processQueue(), interval);
  }

  /**
   * Adds an item to the queue
   *
   * @param item the item to add
   */
  public add(item: T) {
    this.queue.push(item);
    this.itemTimestamps.set(item, Date.now());
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
    if (this.lock) {
      return;
    }

    this.lock = true;
    const item = this.queue.shift() as T;
    if (!item) {
      this.lock = false;
      return;
    }

    const startTime = this.itemTimestamps.get(item);
    if (startTime) {
      const processingTime = Date.now() - startTime;

      // Add new processing time to the array
      this.processingTimes.push(processingTime);

      // Keep only the last MAX_SAMPLES items
      if (this.processingTimes.length > this.MAX_SAMPLES) {
        this.processingTimes.shift();
      }

      this.itemTimestamps.delete(item);
    }

    await this.processItem(item);
    this.lock = false;
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
