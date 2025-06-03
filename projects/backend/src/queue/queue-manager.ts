import { PlayerScoreSeedQueue } from "./impl/player-score-seed-queue";
import { Queue } from "./queue";

export enum QueueName {
  PlayerScoreSeed = "player-score-seed",
}

export class QueueManager {
  private static queues: Map<QueueName, Queue<unknown>> = new Map();

  constructor() {
    QueueManager.addQueue(new PlayerScoreSeedQueue());
  }

  public static addQueue(queue: Queue<unknown>) {
    QueueManager.queues.set(queue.name, queue);
  }

  public static getQueue<T>(name: QueueName): Queue<T> {
    return QueueManager.queues.get(name) as Queue<T>;
  }
}
