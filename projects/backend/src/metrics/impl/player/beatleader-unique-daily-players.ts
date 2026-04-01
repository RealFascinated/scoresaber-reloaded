import Logger, { type ScopedLogger } from "@ssr/common/logger";
import { getMidnightAlignedDate, TimeUnit } from "@ssr/common/utils/time-utils";
import { Gauge } from "prom-client";
import { redisClient } from "../../../common/redis";
import { MetricType, prometheusRegistry } from "../../../service/infra/metrics.service";
import Metric from "../../metric";

export default class BeatLeaderUniqueDailyPlayersMetric extends Metric<null> {
  private static readonly logger: ScopedLogger = Logger.withTopic("Metric: BeatLeader Unique Daily Players");
  private readonly gauge: Gauge;
  private lastCollectedAt = 0;
  private lastKnownCount = 0;

  constructor() {
    super(MetricType.BEATLEADER_UNIQUE_DAILY_PLAYERS, null);

    this.gauge = new Gauge({
      name: "beatleader_unique_daily_players",
      help: "Number of unique BeatLeader daily players",
      registers: [prometheusRegistry],
      collect: async () => {
        await this.collectCount();
      },
    });
  }

  private getDateKey(): string {
    const midnightDate = getMidnightAlignedDate(new Date());
    return `beatleader_unique_daily_players:${midnightDate.toISOString().split("T")[0]}`;
  }

  public async addPlayer(playerId: string): Promise<void> {
    const key = this.getDateKey();
    await redisClient.sadd(key, playerId);
    await redisClient.expire(key, TimeUnit.toSeconds(TimeUnit.Day, 2));
  }

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
      BeatLeaderUniqueDailyPlayersMetric.logger.error(
        "Failed to collect BeatLeader unique daily players metric:",
        error
      );
      this.gauge.set(this.lastKnownCount);
    }
  }
}
