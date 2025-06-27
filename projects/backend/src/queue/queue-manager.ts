import Logger from "@ssr/common/logger";
import { QueueModel } from "@ssr/common/model/queue";
import { isProduction } from "@ssr/common/utils/utils";
import { EventListener } from "../event/event-listener";
import { PlayerScoreSeedQueue } from "./impl/player-score-seed-queue";
import { Queue } from "./queue";

export enum QueueId {
  PlayerScoreRefreshQueue = "player-score-refresh-queue",
  LeaderboardScoreRefreshQueue = "leaderboard-score-refresh-queue",
}

export class QueueManager implements EventListener {
  private static queues: Map<QueueId, Queue<unknown>> = new Map();

  constructor() {
    QueueManager.addQueue(new PlayerScoreSeedQueue());
  }

  /**
   * Adds a queue
   *
   * @param queue the queue to add
   */
  public static async addQueue(queue: Queue<unknown>) {
    if (queue.saveQueueToDatabase && isProduction()) {
      // Load the queue from the database
      const queueData = await QueueModel.findOne({ id: queue.id });
      if (queueData) {
        Logger.debug(`Loaded queue ${queue.id} with ${queueData.items.length} items from database`);

        // Re-add the items to the queue
        queueData.items.forEach(item => {
          queue.add(item);
        });
      }
    }

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
  public static getQueues(): Queue<unknown>[] {
    return Array.from(QueueManager.queues.values());
  }

  async onStop() {
    for (const queue of QueueManager.queues.values()) {
      queue.stop();

      if (queue.saveQueueToDatabase) {
        await QueueModel.updateOne(
          { id: queue.id },
          { $set: { items: queue.getQueue() } },
          { upsert: true, new: true }
        );
        Logger.debug(`Saved queue ${queue.id} with ${queue.getQueue().length} items to database`);
      }
    }
  }
}
