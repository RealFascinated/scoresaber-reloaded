import { InfluxDB, Point } from "@influxdata/influxdb-client";
import Logger from "@ssr/common/logger";
import Metric from "../metrics/metric";
import TrackedPlayersMetric from "../metrics/impl/tracked-players";
import TrackedScoresMetric from "../metrics/impl/tracked-scores";
import { MetricValueModel } from "../common/model/metric";
import UniqueDailyPlayersMetric from "../metrics/impl/unique-daily-players";

const influxClient = new InfluxDB({
  url: process.env.INFLUXDB_URL!,
  token: process.env.INFLUXDB_TOKEN!,
});
const writeApi = influxClient.getWriteApi(process.env.INFLUXDB_ORG!, process.env.INFLUXDB_BUCKET!);

export enum MetricType {
  TRACKED_SCORES = "tracked-scores",
  TRACKED_PLAYERS = "tracked-players",
  UNIQUE_DAILY_PLAYERS = "unique-daily-players",
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
    writeApi.writePoint(points);
  }
}
