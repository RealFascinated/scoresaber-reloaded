import { InfluxDB, Point } from "@influxdata/influxdb-client";
import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { formatDuration, TimeUnit } from "@ssr/common/utils/time-utils";
import { MetricValueModel } from "../common/model/metric";
import { EventListener } from "../event/event-listener";
import { ApiServicesMetric } from "../metrics/impl/backend/api-services";
import EventLoopLagMetric from "../metrics/impl/backend/event-loop-lag";
import EventLoopTimersMetric from "../metrics/impl/backend/event-loop-timers";
import MemoryUsageMetric from "../metrics/impl/backend/memory-usage";
import ProcessCpuUsageMetric from "../metrics/impl/backend/process-cpu-usage";
import RequestsPerSecondMetric from "../metrics/impl/backend/total-requests";
import ProcessUptimeMetric from "../metrics/impl/backend/uptime";
import MongoDbSizeMetric from "../metrics/impl/database/mongo-db-size";
import MapAuthorsMetric from "../metrics/impl/leaderboard/map-authors";
import ActiveAccountsMetric from "../metrics/impl/player/active-accounts";
import ActivePlayerHmdStatisticMetric from "../metrics/impl/player/active-player-hmd-statistic";
import HmdStatisticMetric from "../metrics/impl/player/daily-hmd-statistic";
import DailyNewAccountsMetric from "../metrics/impl/player/daily-new-accounts";
import TotalTrackedScoresMetric from "../metrics/impl/player/total-tracked-scores";
import TrackedPlayersMetric from "../metrics/impl/player/tracked-players";
import TrackedScoresMetric from "../metrics/impl/player/tracked-scores";
import UniqueDailyPlayersMetric from "../metrics/impl/player/unique-daily-players";
import QueueSizesMetric from "../metrics/impl/queue/queue-sizes";
import SystemCpuUsageMetric from "../metrics/impl/system/system-cpu-usage";
import SystemNetworkIoMetric from "../metrics/impl/system/system-network-io";
import Metric from "../metrics/metric";

const influxClient = new InfluxDB({
  url: env.INFLUXDB_URL,
  token: env.INFLUXDB_TOKEN,
});
const writeApi = influxClient.getWriteApi(env.INFLUXDB_ORG, env.INFLUXDB_BUCKET);

export enum MetricType {
  // General metrics
  POINTS_PER_SECOND = "points-per-second",

  // Player metrics
  TRACKED_SCORES = "tracked-scores",
  TRACKED_PLAYERS = "tracked-players",
  UNIQUE_DAILY_PLAYERS = "unique-daily-players",
  ACTIVE_ACCOUNTS = "active-accounts",
  DAILY_HMD_STATISTIC = "daily-hmd-statistic",
  ACTIVE_PLAYERS_HMD_STATISTIC = "active-players-hmd-statistic",
  TOTAL_TRACKED_SCORES = "total-tracked-scores",
  DAILY_NEW_ACCOUNTS = "daily-new-accounts",

  // Leaderboard metrics
  MAP_AUTHORS = "map-authors",

  // Backend metrics
  PROCESS_CPU_USAGE = "process-cpu-usage",
  MEMORY_USAGE = "memory-usage",
  EVENT_LOOP_LAG = "event-loop-lag",
  TOTAL_REQUESTS = "total-requests",
  EVENT_LOOP_TIMERS = "event-loop-timers",
  API_SERVICES = "api-services",
  PROCESS_UPTIME = "process-uptime",

  // System metrics
  SYSTEM_CPU_USAGE = "system-cpu-usage",
  SYSTEM_NETWORK_IO = "system-network-io",

  // Queue metrics
  QUEUE_SIZES = "queue-sizes",

  // Database metrics
  MONGO_DB_SIZE = "mongo-db-size",
}

export default class MetricsService implements EventListener {
  private static instance: MetricsService;
  private static metrics: Metric<unknown>[] = [];

  constructor() {
    if (MetricsService.instance) {
      return MetricsService.instance;
    }
    MetricsService.instance = this;

    this.registerAllMetrics();
    this.initMetrics();

    // Save metrics in the background
    setInterval(
      () => {
        this.saveMetrics();
      },
      TimeUnit.toMillis(TimeUnit.Second, 10)
    );
  }

  /**
   * Registers all available metrics with the service
   */
  private registerAllMetrics(): void {
    // Player metrics
    this.registerMetric(new TrackedScoresMetric());
    this.registerMetric(new TrackedPlayersMetric());
    this.registerMetric(new UniqueDailyPlayersMetric());
    this.registerMetric(new ActiveAccountsMetric());
    this.registerMetric(new HmdStatisticMetric());
    this.registerMetric(new ActivePlayerHmdStatisticMetric());
    this.registerMetric(new TotalTrackedScoresMetric());
    this.registerMetric(new DailyNewAccountsMetric());

    // Leaderboard metrics
    this.registerMetric(new MapAuthorsMetric());

    // Backend metrics
    this.registerMetric(new ProcessCpuUsageMetric());
    this.registerMetric(new MemoryUsageMetric());
    this.registerMetric(new EventLoopLagMetric());
    this.registerMetric(new RequestsPerSecondMetric());
    this.registerMetric(new EventLoopTimersMetric());
    this.registerMetric(new ApiServicesMetric());
    this.registerMetric(new ProcessUptimeMetric());

    // System metrics
    this.registerMetric(new SystemCpuUsageMetric());
    this.registerMetric(new SystemNetworkIoMetric());

    // Queue metrics
    this.registerMetric(new QueueSizesMetric());

    // Database metrics
    this.registerMetric(new MongoDbSizeMetric());
  }

  /**
   * Initializes all registered metrics and sets up their timers
   */
  private async initMetrics(): Promise<void> {
    for (const metric of MetricsService.metrics) {
      if (metric.options.fetchAndStore) {
        const metricValue = await MetricValueModel.findOne({ _id: metric.id });
        if (metricValue) {
          metric.value = metricValue.value;
        }
      }

      await metric.collect(); // Collect all metrics once on boot
      setInterval(async () => {
        const before = Date.now();

        const point = await metric.collect();
        if (point) {
          await this.writePoint(point);
        }

        const timeTaken = Date.now() - before;
        if (timeTaken > 1000) {
          Logger.warn(`[METRICS] Collected and wrote metric ${metric.id} in ${timeTaken}ms`);
        }
      }, metric.options.interval);
    }
  }

  /**
   * Registers a metric with the service
   *
   * @param metric the metric to register
   */
  private registerMetric(metric: Metric<unknown>): void {
    MetricsService.metrics.push(metric);
    Logger.debug(
      `[METRICS] Registered metric ${metric.id} with interval ${formatDuration(
        metric.options.interval
      )}`
    );
  }

  /**
   * Retrieves a metric by its type
   *
   * @param type the type of metric to retrieve
   * @returns the metric instance, or undefined if not found
   */
  public static async getMetric(type: MetricType): Promise<Metric<unknown> | undefined> {
    return MetricsService.metrics.find(metric => metric.id === type);
  }

  /**
   * Writes a point to the cache and increments the points per second counter
   *
   * @param point the point to write
   */
  private async writePoint(point: Point): Promise<void> {
    try {
      const fields = point.fields;
      for (const [key, value] of Object.entries(fields)) {
        if (value === undefined || value === null) {
          Logger.warn(
            `[METRICS] Skipping write to InfluxDB - invalid value for field '${key}': ${value}`
          );
          return;
        }
      }

      writeApi.writePoint(point);
    } catch (error) {
      Logger.error("[METRICS] Failed to write point for InfluxDB:", error);
    }
  }

  /**
   * Saves the metrics to the db
   */
  private async saveMetrics(): Promise<void> {
    for (const metric of MetricsService.metrics) {
      // Check if the metric needs to be saved to the db
      if (metric.options.fetchAndStore) {
        const before = performance.now();
        await MetricValueModel.findOneAndUpdate(
          { _id: metric.id },
          { value: metric.value },
          { upsert: true, setDefaultsOnInsert: true }
        );
        Logger.debug(
          `[METRICS] Saved metric ${metric.id} to primary storage in ${formatDuration(
            performance.now() - before
          )}`
        );
      }
    }
  }

  /**
   * Cleans up all timers and flushes remaining points
   */
  public async cleanup(): Promise<void> {
    for (const metric of MetricsService.metrics) {
      if (
        "cleanup" in metric &&
        typeof (metric as { cleanup: () => void }).cleanup === "function"
      ) {
        (metric as { cleanup: () => void }).cleanup();
      }
    }

    await this.saveMetrics();
  }

  onStop(): Promise<void> {
    this.saveMetrics();
    writeApi.flush(); // Flush remaining points

    return Promise.resolve();
  }
}
