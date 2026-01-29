import { MetricType } from "../service/metrics.service";

export default abstract class Metric<T> {
  /**
   * The id of the metric.
   */
  public id: MetricType;

  /**
   * The value of the metric.
   */
  public value: T;

  protected constructor(id: MetricType, defaultValue: T) {
    this.id = id;
    this.value = defaultValue;
  }

}
