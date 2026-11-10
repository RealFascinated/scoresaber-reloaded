import Logger, { type ScopedLogger } from "@ssr/common/logger";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { isProduction } from "@ssr/common/utils/utils";
import { playerCacheKeysPattern } from "../../common/cache-keys";
import { redisClient } from "../../common/redis";

const HEARTBEAT_KEY = "backend:heartbeat";
const HEARTBEAT_INTERVAL_MS = TimeUnit.toMillis(TimeUnit.Minute, 1);
/** The player cache is kept live by score events, so it is unusable once the backend missed a day of them. */
const MAX_DOWNTIME_MS = TimeUnit.toMillis(TimeUnit.Hour, 24);

/**
 * Keeps the live player cache honest across backend downtime: while the backend is down it misses the
 * score events that invalidate the cache, so a long enough gap means every cached player may be stale.
 */
export class PlayerCacheLivenessService {
  private static readonly logger: ScopedLogger = Logger.withTopic("Player Cache Liveness");
  private static timer: ReturnType<typeof setInterval> | undefined;

  /**
   * Drops every cached player if the backend was down for more than 24 hours, then starts the heartbeat.
   */
  public static async start(): Promise<void> {
    if (!isProduction()) {
      return;
    }

    try {
      const lastHeartbeat = await redisClient.get(HEARTBEAT_KEY);
      const downtimeMs = lastHeartbeat === null ? Infinity : Date.now() - Number(lastHeartbeat);
      // Written as a negation so a missing or malformed heartbeat also flushes
      if (!(downtimeMs <= MAX_DOWNTIME_MS)) {
        PlayerCacheLivenessService.logger.info(
          `No heartbeat in the last 24h (last: ${lastHeartbeat ?? "never"}), dropping all cached players...`
        );
        const removed = await PlayerCacheLivenessService.flushPlayerCaches();
        PlayerCacheLivenessService.logger.info(`Dropped ${removed} cached players.`);
      }
      await PlayerCacheLivenessService.beat();
    } catch (error) {
      PlayerCacheLivenessService.logger.error("Failed to check the heartbeat:", error);
    }

    PlayerCacheLivenessService.timer = setInterval(() => {
      PlayerCacheLivenessService.beat().catch(error =>
        PlayerCacheLivenessService.logger.error("Failed to write the heartbeat:", error)
      );
    }, HEARTBEAT_INTERVAL_MS);
    PlayerCacheLivenessService.timer.unref();
  }

  /**
   * Stops the heartbeat, recording a last one so a clean restart counts as (almost) no downtime.
   */
  public static async stop(): Promise<void> {
    if (PlayerCacheLivenessService.timer === undefined) {
      return;
    }
    clearInterval(PlayerCacheLivenessService.timer);
    PlayerCacheLivenessService.timer = undefined;
    await PlayerCacheLivenessService.beat();
  }

  private static async beat(): Promise<void> {
    await redisClient.set(HEARTBEAT_KEY, Date.now().toString());
  }

  /**
   * Removes every cached player from Redis.
   *
   * @returns how many entries were removed
   */
  private static async flushPlayerCaches(): Promise<number> {
    let removed = 0;
    const stream = redisClient.scanStream({ match: playerCacheKeysPattern, count: 1000 });
    for await (const keys of stream as AsyncIterable<string[]>) {
      if (keys.length > 0) {
        removed += await redisClient.unlink(...keys);
      }
    }
    return removed;
  }
}
