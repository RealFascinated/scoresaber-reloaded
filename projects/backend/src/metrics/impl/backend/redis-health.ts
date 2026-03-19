import Logger from "@ssr/common/logger";
import { Gauge } from "prom-client";
import { redisClient } from "../../../common/redis";
import { MetricType, prometheusRegistry } from "../../../service/metrics.service";
import Metric from "../../metric";

const REDIS_REFRESH_INTERVAL_MS = 10_000;

export default class RedisHealthMetric extends Metric<null> {
  private lastCollectedAt = 0;
  private readonly redisUpGauge: Gauge;
  private readonly redisPingMsGauge: Gauge;

  constructor() {
    super(MetricType.REDIS_HEALTH, null);

    this.redisUpGauge = new Gauge({
      name: "redis_up",
      help: "Redis health status (1 = up, 0 = down)",
      registers: [prometheusRegistry],
      collect: async () => {
        await this.collectRedisMetrics();
      },
    });

    this.redisPingMsGauge = new Gauge({
      name: "redis_ping_ms",
      help: "Redis ping round-trip time in milliseconds",
      registers: [prometheusRegistry],
      collect: async () => {
        await this.collectRedisMetrics();
      },
    });
  }

  private async collectRedisMetrics(): Promise<void> {
    const now = Date.now();
    if (now - this.lastCollectedAt < REDIS_REFRESH_INTERVAL_MS) {
      return;
    }

    this.lastCollectedAt = now;
    const startedAt = performance.now();
    try {
      const response = await redisClient.ping();
      const pingMs = Math.max(0, performance.now() - startedAt);
      this.redisUpGauge.set(response === "PONG" ? 1 : 0);
      this.redisPingMsGauge.set(pingMs);
    } catch (error) {
      this.redisUpGauge.set(0);
      Logger.error("Failed to collect Redis health metrics:", error);
    }
  }
}
