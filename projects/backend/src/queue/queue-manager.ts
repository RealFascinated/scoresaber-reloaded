import { EventListener } from "../event/event-listener";
import { LeaderboardScoreSeedQueue } from "./impl/leaderboard-score-seed-queue";
import { FetchMissingScoresQueue } from "./impl/fetch-missing-scores-queue";
import { Queue, QueueItem } from "./queue";

export enum QueueId {
  PlayerScoreRefreshQueue = "player-score-refresh-queue",
  LeaderboardScoreSeedQueue = "leaderboard-score-seed-queue",
}

export class QueueManager implements EventListener {
  private static queues: Map<QueueId, Queue<QueueItem<unknown>>> = new Map();

  constructor() {
    QueueManager.addQueue(new FetchMissingScoresQueue());
    QueueManager.addQueue(new LeaderboardScoreSeedQueue());
  }

  /**
   * Adds a queue
   *
   * @param queue the queue to add
   */
  public static async addQueue(queue: Queue<QueueItem<unknown>>) {
    // Register the queue
    QueueManager.queues.set(queue.id, queue);
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
  public static getQueues(): Queue<QueueItem<unknown>>[] {
    return Array.from(QueueManager.queues.values());
  }

  async onStop() {
    for (const queue of QueueManager.queues.values()) {
      queue.stop();
    }
  }
}
