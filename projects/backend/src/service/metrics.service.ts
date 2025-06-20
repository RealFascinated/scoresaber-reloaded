import { InfluxDB, Point } from "@influxdata/influxdb-client";
import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { MetricValueModel } from "../common/model/metric";
import { ApiServicesMetric } from "../metrics/impl/backend/api-services";
import EventLoopLagMetric from "../metrics/impl/backend/event-loop-lag";
import EventLoopTimersMetric from "../metrics/impl/backend/event-loop-timers";
import HttpStatusCodesMetric from "../metrics/impl/backend/http-status-codes";
import MemoryUsageMetric from "../metrics/impl/backend/memory-usage";
import ProcessCpuUsageMetric from "../metrics/impl/backend/process-cpu-usage";
import RouteLatencyMetric from "../metrics/impl/backend/route-latency";
import RequestsPerSecondMetric from "../metrics/impl/backend/total-requests";
import ProcessUptimeMetric from "../metrics/impl/backend/uptime";
import MongoDbSizeMetric from "../metrics/impl/database/mongo-db-size";
import PointsPerSecondMetric from "../metrics/impl/general/points-per-second";
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

  // Backend metrics
  PROCESS_CPU_USAGE = "process-cpu-usage",
  MEMORY_USAGE = "memory-usage",
  EVENT_LOOP_LAG = "event-loop-lag",
  TOTAL_REQUESTS = "total-requests",
  ROUTE_LATENCY = "route-latency",
  EVENT_LOOP_TIMERS = "event-loop-timers",
  API_SERVICES = "api-services",
  HTTP_STATUS_CODES = "http-status-codes",
  PROCESS_UPTIME = "process-uptime",

  // System metrics
  SYSTEM_CPU_USAGE = "system-cpu-usage",
  SYSTEM_NETWORK_IO = "system-network-io",

  // Queue metrics
  QUEUE_SIZES = "queue-sizes",

  // Database metrics
  MONGO_DB_SIZE = "mongo-db-size",
}

export default class MetricsService {
  private static instance: MetricsService;
  private static metrics: Metric<unknown>[] = [];
  private metricTimers: Map<string, NodeJS.Timeout> = new Map();
  private pointCache: Point[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor() {
    if (MetricsService.instance) {
      return MetricsService.instance;
    }
    MetricsService.instance = this;

    this.registerAllMetrics();
    this.initMetrics();
    this.setupFlushTimer();
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

    // Backend metrics
    this.registerMetric(new ProcessCpuUsageMetric());
    this.registerMetric(new MemoryUsageMetric());
    this.registerMetric(new EventLoopLagMetric());
    this.registerMetric(new RequestsPerSecondMetric());
    this.registerMetric(new RouteLatencyMetric());
    this.registerMetric(new EventLoopTimersMetric());
    this.registerMetric(new ApiServicesMetric());
    this.registerMetric(new HttpStatusCodesMetric());
    this.registerMetric(new ProcessUptimeMetric());

    // System metrics
    this.registerMetric(new SystemCpuUsageMetric());
    this.registerMetric(new SystemNetworkIoMetric());

    // Queue metrics
    this.registerMetric(new QueueSizesMetric());

    // Database metrics
    this.registerMetric(new MongoDbSizeMetric());

    // General metrics
    this.registerMetric(new PointsPerSecondMetric());
  }

  /**
   * Sets up a timer to flush cached points every 30 seconds
   */
  private setupFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushPoints();
    }, 30_000);
  }

  /**
   * Flushes all cached points to InfluxDB and clears the cache
   */
  private async flushPoints(): Promise<void> {
    if (this.pointCache.length === 0) return;

    try {
      for (const point of this.pointCache) {
        writeApi.writePoint(point);
      }
      await writeApi.flush();
      Logger.info(`Flushed ${this.pointCache.length} points to InfluxDB`);
      this.pointCache = [];
    } catch (error) {
      Logger.error("Failed to flush points to InfluxDB:", error);
    }
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
      await this.setupMetricTimer(metric);
    }
    this.isInitialized = true;
  }

  /**
   * Sets up a timer for a specific metric to collect data at regular intervals
   *
   * @param metric the metric to set up a timer for
   */
  private async setupMetricTimer(metric: Metric<unknown>): Promise<void> {
    const point = await metric.collect();
    if (point) {
      await this.writePoints(point);
    }

    const existingTimer = this.metricTimers.get(metric.id);
    if (existingTimer) {
      clearInterval(existingTimer);
    }

    const timer = setInterval(async () => {
      const before = Date.now();

      const point = await metric.collect();
      if (point) {
        await this.writePoints(point);
      }

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

  /**
   * Registers a metric with the service
   *
   * @param metric the metric to register
   */
  private registerMetric(metric: Metric<unknown>): void {
    MetricsService.metrics.push(metric);
  }

  /**
   * Retrieves a metric by its type
   *
   * @param type the type of metric to retrieve
   * @returns the metric instance
   * @throws error if the metric is not found
   */
  public static async getMetric(type: MetricType): Promise<Metric<unknown>> {
    const metric = MetricsService.metrics.find(metric => metric.id === type);
    if (!metric) {
      throw new Error(`Metric "${type}" not found`);
    }
    return metric;
  }

  /**
   * Writes a point to the cache and increments the points per second counter
   *
   * @param points the point to write
   */
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

      const pointsPerSecondMetric = MetricsService.metrics.find(
        metric => metric.id === MetricType.POINTS_PER_SECOND
      ) as PointsPerSecondMetric;
      if (pointsPerSecondMetric && this.isInitialized) {
        pointsPerSecondMetric.incrementPointCount();
      }
    } catch (error) {
      Logger.error("Failed to cache point for InfluxDB:", error);
    }
  }

  /**
   * Cleans up all timers and flushes remaining points
   */
  public async cleanup(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    for (const timer of this.metricTimers.values()) {
      clearInterval(timer);
    }
    this.metricTimers.clear();

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
