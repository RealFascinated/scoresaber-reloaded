import { QueueName } from "./queue-manager";

export abstract class Queue<T> {
  /**
   * The name of the queue
   */
  public readonly name: QueueName;

  private queue: T[] = [];
  private lock = false;

  constructor(name: QueueName, interval: number = 30_000) {
    this.name = name;
    setInterval(this.processQueue, interval);
  }

  /**
   * Adds an item to the queue
   *
   * @param item the item to add
   */
  public add(item: T) {
    this.queue.push(item);
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
    await this.processItem(item);
    this.lock = false;
  }

  /**
   * Processes an item in the queue
   *
   * @param item the item to process
   */
  protected abstract processItem(item: T): Promise<void>;
}
