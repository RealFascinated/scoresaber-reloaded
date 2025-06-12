import { InfluxDB, Point } from "@influxdata/influxdb-client";
import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { MetricValueModel } from "../common/model/metric";
import { ApiServicesMetric } from "../metrics/impl/backend/api-services";
import CpuUsageMetric from "../metrics/impl/backend/cpu-usage";
import EventLoopLagMetric from "../metrics/impl/backend/event-loop-lag";
import EventLoopTimersMetric from "../metrics/impl/backend/event-loop-timers";
import MemoryUsageMetric from "../metrics/impl/backend/memory-usage";
import RouteLatencyMetric from "../metrics/impl/backend/route-latency";
import RequestsPerSecondMetric from "../metrics/impl/backend/total-requests";
import BeatSaverWebsocketMetric from "../metrics/impl/beatsaver/beatsaver-websocket-metrics";
import MongoDbSizeMetric from "../metrics/impl/database/mongo-db-size";
import ActiveAccountsMetric from "../metrics/impl/player/active-accounts";
import DailyNewAccountsMetric from "../metrics/impl/player/daily-new-accounts";
import HmdStatisticMetric from "../metrics/impl/player/hmd-statistic";
import TotalTrackedScoresMetric from "../metrics/impl/player/total-tracked-scores";
import TrackedPlayersMetric from "../metrics/impl/player/tracked-players";
import TrackedScoresMetric from "../metrics/impl/player/tracked-scores";
import UniqueDailyPlayersMetric from "../metrics/impl/player/unique-daily-players";
import QueueAverageTimeMetric from "../metrics/impl/queue/queue-avg-processing-time";
import QueueSizesMetric from "../metrics/impl/queue/queue-sizes";
import Metric from "../metrics/metric";

const influxClient = new InfluxDB({
  url: env.INFLUXDB_URL,
  token: env.INFLUXDB_TOKEN,
});
const writeApi = influxClient.getWriteApi(env.INFLUXDB_ORG, env.INFLUXDB_BUCKET);

export enum MetricType {
  // Player metrics
  TRACKED_SCORES = "tracked-scores",
  TRACKED_PLAYERS = "tracked-players",
  UNIQUE_DAILY_PLAYERS = "unique-daily-players",
  ACTIVE_ACCOUNTS = "active-accounts",
  REPLAY_STATS = "replay-stats",
  HMD_STATISTIC = "hmd-statistic",
  TOTAL_TRACKED_SCORES = "total-tracked-scores",
  DAILY_NEW_ACCOUNTS = "daily-new-accounts",

  // Backend metrics
  CPU_USAGE = "cpu-usage",
  MEMORY_USAGE = "memory-usage",
  EVENT_LOOP_LAG = "event-loop-lag",
  TOTAL_REQUESTS = "total-requests",
  ROUTE_LATENCY = "route-latency",
  EVENT_LOOP_TIMERS = "event-loop-timers",
  API_SERVICES = "api-services",

  // Queue metrics
  QUEUE_SIZES = "queue-sizes",
  QUEUE_AVERAGE_PROCESSING_TIME = "queue-average-processing-time",

  // Database metrics
  MONGO_DB_SIZE = "mongo-db-size",

  // Beatsaver metrics
  BEATSAVER_WEBSOCKET_MAP_METRICS = "beatsaver-websocket-map-metrics",
}

export default class MetricsService {
  private static instance: MetricsService;
  private static metrics: Metric<unknown>[] = [];
  private metricTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Cache for storing metric points before sending them to InfluxDB.
   * Points are stored here for 1 minute before being flushed in a batch.
   */
  private pointCache: Point[] = [];

  /**
   * Timer that triggers the flushing of cached points every minute.
   * Null when the service is not running.
   */
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    if (MetricsService.instance) {
      return MetricsService.instance;
    }
    MetricsService.instance = this;

    this.registerMetric(new TrackedScoresMetric());
    this.registerMetric(new TrackedPlayersMetric());
    this.registerMetric(new UniqueDailyPlayersMetric());
    this.registerMetric(new ActiveAccountsMetric());
    this.registerMetric(new HmdStatisticMetric());
    this.registerMetric(new TotalTrackedScoresMetric());
    this.registerMetric(new DailyNewAccountsMetric());

    // Backend metrics
    this.registerMetric(new CpuUsageMetric());
    this.registerMetric(new MemoryUsageMetric());
    this.registerMetric(new EventLoopLagMetric());
    this.registerMetric(new RequestsPerSecondMetric());
    this.registerMetric(new RouteLatencyMetric());
    this.registerMetric(new EventLoopTimersMetric());
    this.registerMetric(new ApiServicesMetric());

    // Queue metrics
    this.registerMetric(new QueueSizesMetric());
    this.registerMetric(new QueueAverageTimeMetric());

    // Database metrics
    this.registerMetric(new MongoDbSizeMetric());

    // Beatsaver metrics
    this.registerMetric(new BeatSaverWebsocketMetric());

    this.initMetrics();
    this.setupFlushTimer();
  }

  /**
   * Creates a timer to flush cached points every 30 seconds.
   */
  private setupFlushTimer() {
    // Flush cache every minute
    this.flushTimer = setInterval(() => {
      this.flushPoints();
    }, 30_000); // 30 seconds
  }

  /**
   * Flushes all cached points to InfluxDB.
   * It writes all points in the cache and then clears the cache.
   */
  private async flushPoints() {
    if (this.pointCache.length === 0) return;

    try {
      // Write all cached points to InfluxDB
      for (const point of this.pointCache) {
        writeApi.writePoint(point);
      }
      // Ensure all points are written to the database
      await writeApi.flush();
      Logger.info(`Flushed ${this.pointCache.length} points to InfluxDB`);
      // Clear the cache after successful write
      this.pointCache = [];
    } catch (error) {
      Logger.error("Failed to flush points to InfluxDB:", error);
    }
  }

  private async initMetrics() {
    for (const metric of MetricsService.metrics) {
      // If the metric needs to be fetched after registration, fetch the value from the database
      if (metric.options.fetchAndStore) {
        const metricValue = await MetricValueModel.findOne({ _id: metric.id });
        if (metricValue) {
          metric.value = metricValue.value;
        }
      }

      // Set up individual timer for each metric
      this.setupMetricTimer(metric);
    }
  }

  /**
   * Sets up a timer for a metric.
   *
   * @param metric the metric to set up a timer for
   */
  private async setupMetricTimer(metric: Metric<unknown>) {
    // Collect first value immediately
    const point = await metric.collect();
    if (point) {
      await this.writePoints(point);
    }

    // Clear existing timer if any
    const existingTimer = this.metricTimers.get(metric.id);
    if (existingTimer) {
      clearInterval(existingTimer);
    }

    const timer = setInterval(async () => {
      const before = Date.now();

      // Collect the metric
      const point = await metric.collect();
      if (point) {
        await this.writePoints(point);
      }

      // Update the metric value
      if (metric.options.fetchAndStore) {
        await MetricValueModel.findOneAndUpdate(
          { _id: metric.id },
          { value: metric.value },
          { upsert: true, setDefaultsOnInsert: true }
        );
      }

      const timeTaken = Date.now() - before;
      if (timeTaken > 3000) {
        Logger.warn(`Collected and wrote metric ${metric.id} in ${timeTaken}ms`);
      }
    }, metric.options.interval);

    this.metricTimers.set(metric.id, timer);
  }

  private registerMetric(metric: Metric<unknown>) {
    MetricsService.metrics.push(metric);
  }

  public static async getMetric(type: MetricType): Promise<Metric<unknown>> {
    const metric = MetricsService.metrics.find(metric => metric.id === type);
    if (!metric) {
      throw new Error(`Metric "${type}" not found`);
    }
    return metric;
  }

  private async writePoints(points: Point): Promise<void> {
    try {
      const fields = points.fields;
      for (const [key, value] of Object.entries(fields)) {
        if (value === undefined || value === null) {
          Logger.warn(`Skipping write to InfluxDB - invalid value for field '${key}': ${value}`);
          return;
        }
      }

      points.timestamp(new Date());
      this.pointCache.push(points);
    } catch (error) {
      Logger.error("Failed to cache point for InfluxDB:", error);
    }
  }

  public async cleanup() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    // Clean up all metric timers
    for (const timer of this.metricTimers.values()) {
      clearInterval(timer);
    }
    this.metricTimers.clear();

    // Clean up individual metrics
    for (const metric of MetricsService.metrics) {
      if (
        "cleanup" in metric &&
        typeof (metric as { cleanup: () => void }).cleanup === "function"
      ) {
        (metric as { cleanup: () => void }).cleanup();
      }
    }

    await this.flushPoints();
  }
}
