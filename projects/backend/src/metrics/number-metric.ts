import { MetricType } from "../service/metrics.service";
import Metric, { MetricOptions } from "./metric";

export default class NumberMetric extends Metric<number> {
  constructor(id: MetricType, defaultValue: number, options?: MetricOptions) {
    super(id, defaultValue, options);
  }


  /**
   * Updates the value of the metric.
   *
   * @param value the new value
   */
  public updateValue(value: number) {
    this.value = value;
  }

  /**
   * Increments the value of the metric.
   */
  public increment() {
    this.value++;
  }

  /**
   * Decrements the value of the metric.
   */
  public decrement() {
    this.value--;
  }
}
