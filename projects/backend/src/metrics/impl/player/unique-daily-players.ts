import { getMidnightAlignedDate, TimeUnit } from "@ssr/common/utils/time-utils";
import Logger from "@ssr/common/logger";
import { Gauge } from "prom-client";
import { redisClient } from "../../../common/redis";
import { MetricType, prometheusRegistry } from "../../../service/metrics.service";
import Metric from "../../metric";

export default class UniqueDailyPlayersMetric extends Metric<null> {
  private readonly gauge: Gauge;
  private lastCollectedAt = 0;
  private lastKnownCount = 0;

  constructor() {
    super(MetricType.UNIQUE_DAILY_PLAYERS, null);

    this.gauge = new Gauge({
      name: "unique_daily_players",
      help: "Number of unique daily players",
      registers: [prometheusRegistry],
      collect: async () => {
        await this.collectCount();
      },
    });
  }

  /**
   * Gets the Redis key for the current date
   */
  private getDateKey(): string {
    const midnightDate = getMidnightAlignedDate(new Date());
    return `unique_daily_players:${midnightDate.toISOString().split("T")[0]}`;
  }

  /**
   * Adds a player ID to the unique daily players set
   */
  public async addPlayer(playerId: string): Promise<void> {
    const key = this.getDateKey();
    await redisClient.sadd(key, playerId);
    await redisClient.expire(key, TimeUnit.toSeconds(TimeUnit.Day, 2));
  }

  /**
   * Gets the count of unique daily players
   */
  public async getUniqueCount(): Promise<number> {
    return await redisClient.scard(this.getDateKey());
  }

  private async collectCount(): Promise<void> {
    const now = Date.now();
    if (now - this.lastCollectedAt < 30_000) {
      this.gauge.set(this.lastKnownCount);
      return;
    }

    this.lastCollectedAt = now;
    try {
      const count = await this.getUniqueCount();
      this.lastKnownCount = count;
      this.gauge.set(count);
    } catch (error) {
      Logger.error("Failed to collect unique daily players metric:", error);
      this.gauge.set(this.lastKnownCount);
    }
  }
}
