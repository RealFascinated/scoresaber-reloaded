import { Point } from "@influxdata/influxdb-client";
import Metric, { MetricOptions } from "./metric";
import { MetricType } from "../service/metrics.service";

export default class NumberMetric extends Metric<number> {
  constructor(id: MetricType, defaultValue: number, options?: MetricOptions) {
    super(id, defaultValue, options);
  }

  /**
   * Collects the metric.
   *
   * @returns the metric
   */
  public collect(): Promise<Point> {
    return Promise.resolve(this.getPointBase().intField("value", this.value));
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
