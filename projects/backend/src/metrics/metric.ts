import { MetricType } from "../service/infra/metrics.service";

export type MetricOptions = {
  /**
   * When false, this metric is excluded from PostgreSQL load/save in MetricsService.
   * Use for ephemeral snapshots, Prometheus-native metrics, or values always recomputed from source.
   */
  persist?: boolean;
};

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
   * Whether this metric's `value` is loaded from and saved to the metrics table.
   */
  public readonly persist: boolean;

  protected constructor(id: MetricType, defaultValue: T, options?: MetricOptions) {
    this.id = id;
    this.value = defaultValue;
    this.persist = options?.persist ?? true;
  }

  public cleanup?(): void;
}
