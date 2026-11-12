import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { parse, stringify } from "devalue";
import type { Result } from "ioredis";
import { redisClient } from "../common/redis";
import { QueueId } from "./queue-manager";

const queueLogger = Logger.withTopic("Queue");

/**
 * Atomic queue operations. A queue is these keys:
 * - `queue::<id>`: the waiting items. An item whose data is its own id is stored as just the id,
 *   anything else as `<item id>\n<devalue data>`.
 * - `queue::<id>::members::<bucket>`: the ids that are waiting, split over MEMBER_BUCKETS small sets for
 *   O(1) de-duplication. Redis stores small all-integer sets as a packed intset (~8 bytes per id) instead
 *   of a hashtable (~60+ bytes per id), which only works while every set stays small.
 * - `queue::<id>::processing`: the items a worker has popped but not finished yet.
 */
const ITEM_SEPARATOR = "\n";
const LEGACY_ITEM_PREFIX = "[";
const MEMBER_BUCKETS = 1024;

/** Lua helpers shared by the scripts below: which member set an id belongs to, and an item's id. */
const LUA_HELPERS = `
  local BUCKETS = ${MEMBER_BUCKETS}
  local function memberKey(prefix, id)
    -- Hash the tail of the id text (ids are too big for a double to keep their low digits)
    local bucket = 0
    for i = math.max(1, #id - 5), #id do
      bucket = (bucket * 31 + string.byte(id, i)) % BUCKETS
    end
    return prefix .. string.format('%d', bucket)
  end
  local function itemId(raw)
    if string.sub(raw, 1, 1) == '${LEGACY_ITEM_PREFIX}' then
      return nil
    end
    local sep = string.find(raw, '\\n', 1, true)
    if sep then
      return string.sub(raw, 1, sep - 1)
    end
    return raw
  end
`;

redisClient.defineCommand("queueAdd", {
  numberOfKeys: 2,
  // KEYS: queue, members prefix. ARGV: itemId, element, itemId, element, ... Returns how many were new.
  lua: `${LUA_HELPERS}
    local added = 0
    for i = 1, #ARGV, 2 do
      if redis.call('SADD', memberKey(KEYS[2], ARGV[i]), ARGV[i]) == 1 then
        redis.call('LPUSH', KEYS[1], ARGV[i + 1])
        added = added + 1
      end
    end
    return added
  `,
});

redisClient.defineCommand("queuePop", {
  numberOfKeys: 3,
  // KEYS: queue, processing, members prefix. ARGV: side of the queue to pop from (LEFT or RIGHT).
  lua: `${LUA_HELPERS}
    local raw = redis.call('LMOVE', KEYS[1], KEYS[2], ARGV[1], 'LEFT')
    if raw then
      local id = itemId(raw)
      if id then
        redis.call('SREM', memberKey(KEYS[3], id), id)
      end
    end
    return raw
  `,
});

redisClient.defineCommand("queueAckPop", {
  numberOfKeys: 3,
  // KEYS: queue, processing, members prefix. ARGV: side to pop from (LEFT or RIGHT), the finished item,
  // and "1" to pop the next item (or "0" to only acknowledge the finished one).
  // The finished item leaves the processing list in the same step the next one enters it.
  lua: `${LUA_HELPERS}
    redis.call('LREM', KEYS[2], 1, ARGV[2])
    if ARGV[3] ~= '1' then
      return false
    end
    local raw = redis.call('LMOVE', KEYS[1], KEYS[2], ARGV[1], 'LEFT')
    if raw then
      local id = itemId(raw)
      if id then
        redis.call('SREM', memberKey(KEYS[3], id), id)
      end
    end
    return raw
  `,
});

redisClient.defineCommand("queueRecover", {
  numberOfKeys: 3,
  // KEYS: queue, processing, members prefix. Moves every in-flight item back on the queue. Returns how many.
  lua: `${LUA_HELPERS}
    local recovered = 0
    while true do
      local raw = redis.call('LMOVE', KEYS[2], KEYS[1], 'RIGHT', 'LEFT')
      if not raw then
        break
      end
      local id = itemId(raw)
      if id then
        redis.call('SADD', memberKey(KEYS[3], id), id)
      end
      recovered = recovered + 1
    end
    return recovered
  `,
});

redisClient.defineCommand("queueHas", {
  numberOfKeys: 1,
  // KEYS: members prefix. ARGV: itemId. Returns 1 when that id is waiting.
  lua: `${LUA_HELPERS}
    return redis.call('SISMEMBER', memberKey(KEYS[1], ARGV[1]), ARGV[1])
  `,
});

declare module "ioredis" {
  interface RedisCommander<Context> {
    queueAdd(queue: string, membersPrefix: string, ...idsAndElements: string[]): Result<number, Context>;
    queuePop(
      queue: string,
      processing: string,
      membersPrefix: string,
      side: "LEFT" | "RIGHT"
    ): Result<string | null, Context>;
    queueAckPop(
      queue: string,
      processing: string,
      membersPrefix: string,
      side: "LEFT" | "RIGHT",
      finished: string,
      popNext: "0" | "1"
    ): Result<string | null, Context>;
    queueRecover(queue: string, processing: string, membersPrefix: string): Result<number, Context>;
    queueHas(membersPrefix: string, itemId: string): Result<number, Context>;
  }
}

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

export abstract class Queue<T extends QueueItem<unknown>> {
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

  /** Max items pushed to Redis per command when adding a batch. */
  private static readonly ADD_BATCH_SIZE = 1_000;

  /**
   * Number of in-flight item processors
   */
  private activeWorkers = 0;

  /**
   * Whether the queue is stopped
   */
  private isStopped = false;

  /**
   * Whether items left in the processing list by a previous run were put back on the queue
   */
  private recoveredInFlight = false;

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

    await redisClient.queueAdd(this.queueKey, this.membersPrefix, item.id, this.serialize(item));
    // Use setImmediate to ensure the item is committed before processing
    setImmediate(() => this.processQueue());
  }

  /**
   * Adds multiple items to the queue
   *
   * @param items the items to add
   */
  public async addAll(items: T[]) {
    if (this.isStopped || items.length === 0) {
      return;
    }

    // Pushed in batches over one pipeline: a seed queue takes hundreds of thousands of ids, and a round
    // trip per item kept it filling for longer than a processing cycle. Items already waiting are skipped.
    const pipeline = redisClient.pipeline();
    for (let i = 0; i < items.length; i += Queue.ADD_BATCH_SIZE) {
      const entries = items
        .slice(i, i + Queue.ADD_BATCH_SIZE)
        .flatMap(item => [item.id, this.serialize(item)]);
      pipeline.queueAdd(this.queueKey, this.membersPrefix, ...entries);
    }
    const results = await pipeline.exec();
    for (const [error] of results ?? []) {
      if (error) {
        throw error;
      }
    }

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

    try {
      await this.recoverInFlightItems();
    } catch (error) {
      this.recoveredInFlight = false;
      queueLogger.error(`Failed to recover in-flight items for queue ${this.id}:`, error);
      return;
    }

    while (this.activeWorkers < this.concurrency && !this.isStopped) {
      // Reserve the worker slot before awaiting the pop so concurrent callers can't exceed the limit
      this.activeWorkers++;

      let rawItem: string | null;
      try {
        // The item moves to a processing list and is only removed once handled, so a crash doesn't lose it
        rawItem = await redisClient.queuePop(
          this.queueKey,
          this.processingKey,
          this.membersPrefix,
          this.popSide
        );
      } catch (error) {
        this.activeWorkers--;
        queueLogger.error(`Failed to pop an item from queue ${this.id}:`, error);
        break;
      }

      if (!rawItem) {
        this.activeWorkers--;
        break;
      }

      void this.runWorker(rawItem);
    }
  }

  private get queueKey(): string {
    return `queue::${this.id}`;
  }

  private get processingKey(): string {
    return `queue::${this.id}::processing`;
  }

  private get popSide(): "LEFT" | "RIGHT" {
    return this.queueMode === "fifo" ? "RIGHT" : "LEFT";
  }

  private get membersPrefix(): string {
    return `queue::${this.id}::members::`;
  }

  private serialize(item: T): string {
    if (item.id.includes(ITEM_SEPARATOR) || item.id.startsWith(LEGACY_ITEM_PREFIX)) {
      throw new Error(`Queue ${this.id} item id must not contain a newline or start with "[": ${item.id}`);
    }
    return item.data === item.id ? item.id : `${item.id}${ITEM_SEPARATOR}${stringify(item.data)}`;
  }

  private deserialize(raw: string): T {
    if (raw.startsWith(LEGACY_ITEM_PREFIX)) {
      // Written before the id was split out of the payload
      return parse(raw) as T;
    }
    const separator = raw.indexOf(ITEM_SEPARATOR);
    if (separator === -1) {
      return { id: raw, data: raw } as T;
    }
    return { id: raw.slice(0, separator), data: parse(raw.slice(separator + 1)) } as T;
  }

  /**
   * Puts items that were being processed when the previous process stopped back on the queue.
   */
  private async recoverInFlightItems(): Promise<void> {
    if (this.recoveredInFlight) {
      return;
    }
    this.recoveredInFlight = true;

    const recovered = await redisClient.queueRecover(this.queueKey, this.processingKey, this.membersPrefix);
    if (recovered > 0) {
      queueLogger.info(`Recovered ${recovered} in-flight items for queue ${this.id}`);
    }
  }

  /**
   * Processes items one after another until the queue is empty. Each finished item is acknowledged and the
   * next one popped in a single Redis call, so a crash between the two can't lose or repeat an item.
   */
  private async runWorker(firstItem: string): Promise<void> {
    let rawItem: string | null = firstItem;
    while (rawItem !== null) {
      await this.runOneItem(rawItem);

      try {
        rawItem = await redisClient.queueAckPop(
          this.queueKey,
          this.processingKey,
          this.membersPrefix,
          this.popSide,
          rawItem,
          this.isStopped ? "0" : "1"
        );
      } catch (error) {
        queueLogger.error(`Failed to clear in-flight item from queue ${this.id}:`, error);
        rawItem = null;
      }
    }
    this.activeWorkers--;
  }

  private async runOneItem(rawItem: string): Promise<void> {
    try {
      const item = this.deserialize(rawItem);
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
      queueLogger.error(`Error processing queue ${this.id}: dropped item ${rawItem}`, error);
    }
  }

  /**
   * Gets the size of the queue
   *
   * @returns the size of the queue
   */
  public async getSize(): Promise<number> {
    return await redisClient.llen(this.queueKey);
  }

  public getActiveWorkers(): number {
    return this.activeWorkers;
  }

  public async hasItem(item: T): Promise<boolean> {
    // Waiting items are looked up by id in the members set; the processing list only holds a few items
    const [queued, inFlight] = await Promise.all([
      redisClient.queueHas(this.membersPrefix, item.id),
      redisClient.lpos(this.processingKey, this.serialize(item)),
    ]);
    return queued === 1 || inFlight !== null;
  }

  /**
   * Stops the queue and waits (up to the timeout) for in-flight items to finish
   *
   * @param timeoutMs the max time to wait for the workers
   */
  public async stop(timeoutMs: number = 5_000): Promise<void> {
    this.isStopped = true;

    const deadline = Date.now() + timeoutMs;
    while (this.activeWorkers > 0 && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  /**
   * Processes an item in the queue
   *
   * @param item the item to process
   */
  protected abstract processItem(item: T): Promise<void>;
}
