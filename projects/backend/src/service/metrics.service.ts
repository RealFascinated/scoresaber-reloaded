import { InfluxDB, Point } from "@influxdata/influxdb-client";
import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { MetricValueModel } from "../common/model/metric";
import ActiveAccountsMetric from "../metrics/impl/active-accounts";
import MongoDbSizeMetric from "../metrics/impl/mongo-db-size";
import TrackedPlayersMetric from "../metrics/impl/tracked-players";
import TrackedScoresMetric from "../metrics/impl/tracked-scores";
import UniqueDailyPlayersMetric from "../metrics/impl/unique-daily-players";
import Metric from "../metrics/metric";

const influxClient = new InfluxDB({
  url: env.INFLUXDB_URL,
  token: env.INFLUXDB_TOKEN,
});
const writeApi = influxClient.getWriteApi(env.INFLUXDB_ORG, env.INFLUXDB_BUCKET);

export enum MetricType {
  TRACKED_SCORES = "tracked-scores",
  TRACKED_PLAYERS = "tracked-players",
  UNIQUE_DAILY_PLAYERS = "unique-daily-players",
  ACTIVE_ACCOUNTS = "active-accounts",
  MONGO_DB_SIZE = "mongo-db-size",
  REPLAY_STATS = "replay-stats",
}

export default class MetricsService {
  /**
   * The registered metrics.
   * @private
   */
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
    this.registerMetric(new TrackedScoresMetric());
    this.registerMetric(new TrackedPlayersMetric());
    this.registerMetric(new UniqueDailyPlayersMetric());
    this.registerMetric(new ActiveAccountsMetric());
    this.registerMetric(new MongoDbSizeMetric());

    this.initMetrics();
    this.setupFlushTimer();
  }

  /**
   * Sets up a timer to flush cached points every minute.
   * This helps reduce the number of writes to InfluxDB by batching points together.
   */
  private setupFlushTimer() {
    // Flush cache every minute
    this.flushTimer = setInterval(() => {
      this.flushPoints();
    }, 60000); // 1 minute
  }

  /**
   * Flushes all cached points to InfluxDB.
   * This method is called every minute by the flush timer.
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
      if (metric.options.fetchAfterRegister) {
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
      if (metric.options.fetchAfterRegister) {
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
   * Registers a new metric.
   *
   * @param metric the metric to register
   */
  private registerMetric(metric: Metric<unknown>) {
    MetricsService.metrics.push(metric);
  }

  /**
   * Gets a metric.
   *
   * @param type the type of metric
   * @returns the metric
   */
  public static async getMetric(type: MetricType): Promise<Metric<unknown>> {
    const metric = MetricsService.metrics.find(metric => metric.id === type);
    if (!metric) {
      throw new Error(`Metric "${type}" not found`);
    }
    return metric;
  }

  /**
   * Writes a point to the cache instead of directly to InfluxDB.
   * Points are validated before being added to the cache.
   * They will be flushed to InfluxDB after 1 minute.
   *
   * @param points the points to cache
   */
  private async writePoints(points: Point): Promise<void> {
    try {
      // Validate that the point has valid values before caching
      const fields = points.fields;
      for (const [key, value] of Object.entries(fields)) {
        if (value === undefined || value === null) {
          Logger.warn(`Skipping write to InfluxDB - invalid value for field '${key}': ${value}`);
          return;
        }
      }

      // Add timestamp when the point was collected
      points.timestamp(new Date());

      // Add point to cache instead of writing immediately
      this.pointCache.push(points);
    } catch (error) {
      Logger.error("Failed to cache point for InfluxDB:", error);
    }
  }

  /**
   * Cleans up the service by stopping the flush timer and flushing any remaining points.
   * This should be called when the service is being shut down to ensure no data is lost.
   */
  public async cleanup() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    await this.flushPoints();
  }
}
