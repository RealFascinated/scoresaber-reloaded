import { InfluxDB, Point } from "@influxdata/influxdb-client";
import Logger from "@ssr/common/logger";
import { MetricValueModel } from "../common/model/metric";
import TrackedPlayersMetric from "../metrics/impl/tracked-players";
import TrackedScoresMetric from "../metrics/impl/tracked-scores";
import UniqueDailyPlayersMetric from "../metrics/impl/unique-daily-players";
import Metric from "../metrics/metric";
import { env } from "@ssr/common/env";
import ActiveAccountsMetric from "../metrics/impl/active-accounts";

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
}

export default class MetricsService {
  /**
   * The registered metrics.
   * @private
   */
  private static metrics: Metric<unknown>[] = [];

  constructor() {
    this.registerMetric(new TrackedScoresMetric());
    this.registerMetric(new TrackedPlayersMetric());
    this.registerMetric(new UniqueDailyPlayersMetric());
    this.registerMetric(new ActiveAccountsMetric());

    this.initMetrics();
  }

  private async initMetrics() {
    for (const metric of MetricsService.metrics) {
      // If the metric does not need to be fetched after registration, skip
      if (!metric.options.fetchAfterRegister) {
        continue;
      }

      // Fetch the metric value from the database
      const metricValue = await MetricValueModel.findOne({ _id: metric.id });
      if (metricValue) {
        metric.value = metricValue.value;
      }
    }

    setInterval(async () => {
      const before = Date.now();

      for (const metric of MetricsService.metrics) {
        // Collect the metric
        await this.writePoints(await metric.collect());

        // Update the metric value
        if (metric.options.fetchAfterRegister) {
          await MetricValueModel.findOneAndUpdate(
            { _id: metric.id },
            { value: metric.value },
            { upsert: true, setDefaultsOnInsert: true }
          );
        }
      }

      const timeTaken = Date.now() - before;
      if (timeTaken > 3000) {
        Logger.warn(`Collected and wrote metrics in ${timeTaken}ms`);
      }
    }, 1000 * 5); // every 5 seconds
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
   * Writes a point to Influx.
   *
   * @param points the points to write
   */
  private async writePoints(points: Point): Promise<void> {
    try {
      // Validate that the point has valid values before writing
      const fields = points.fields;
      for (const [key, value] of Object.entries(fields)) {
        if (value === undefined || value === null) {
          Logger.warn(`Skipping write to InfluxDB - invalid value for field '${key}': ${value}`);
          return;
        }
      }

      writeApi.writePoint(points);
    } catch (error) {
      Logger.error("Failed to write points to InfluxDB:", error);
    }
  }
}
