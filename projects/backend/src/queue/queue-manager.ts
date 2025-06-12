import { PlayerScoreSeedQueue } from "./impl/player-score-seed-queue";
import { Queue } from "./queue";

export enum QueueId {
  PlayerScoreSeed = "player-score-seed-queue",
}

export class QueueManager {
  private static queues: Map<QueueId, Queue<unknown>> = new Map();

  constructor() {
    QueueManager.addQueue(new PlayerScoreSeedQueue());
  }

  /**
   * Adds a queue
   *
   * @param queue the queue to add
   */
  public static addQueue(queue: Queue<unknown>) {
    QueueManager.queues.set(queue.name, queue);
  }

  /**
   * Gets a queue by name
   *
   * @param name the name of the queue
   * @returns the queue
   */
  public static getQueue<T>(name: QueueId): Queue<T> {
    return QueueManager.queues.get(name) as Queue<T>;
  }

  /**
   * Gets all queues
   *
   * @returns all queues
   */
  public static getQueues(): Queue<unknown>[] {
    return Array.from(QueueManager.queues.values());
  }
}
