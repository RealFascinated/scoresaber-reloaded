import { Point } from "@influxdata/influxdb3-client";
import { MetricType } from "../service/metrics.service";
import Metric, { MetricOptions } from "./metric";

export default class NumberMetric extends Metric<number> {
  constructor(id: MetricType, defaultValue: number, options?: MetricOptions) {
    super(id, defaultValue, options);
  }

  /**
   * Collects the metric.
   *
   * @returns the metric
   */
  public collect(): Promise<Point | undefined> {
    // Ensure we never send undefined values
    const value = this.value ?? 0;
    return Promise.resolve(this.getPointBase().setFloatField("value", value));
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
