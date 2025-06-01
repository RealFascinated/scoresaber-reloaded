import { Point } from "@influxdata/influxdb-client";
import { MetricType } from "../service/metrics.service";

export interface MetricOptions {
  /**
   * Whether to fetch the metric from the database after registration.
   */
  fetchAfterRegister?: boolean;

  /**
   * The interval in milliseconds at which to collect this metric.
   */
  interval: number;
}

export default abstract class Metric<T> {
  /**
   * The id of the metric.
   */
  public id: MetricType;

  /**
   * The value of the metric.
   */
  public value: T;

  /**
   * The options of the metric.
   */
  public options: MetricOptions;

  protected constructor(id: MetricType, defaultValue: T, options?: Partial<MetricOptions>) {
    this.id = id;
    this.value = defaultValue;
    this.options = {
      fetchAfterRegister: false,
      interval: 5 * 60 * 1000, // 5 minutes default
      ...options,
    };
  }

  /**
   * Collects the metric(s).
   */
  public abstract collect(): Promise<Point>;

  /**
   * Gets the base point.
   * @private
   */
  protected getPointBase(): Point {
    return new Point(this.id);
  }
}
