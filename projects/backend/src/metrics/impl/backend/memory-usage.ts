import { Point } from "@influxdata/influxdb-client";
import { heapSize } from "bun:jsc";
import { MetricType } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class MemoryUsageMetric extends NumberMetric {
  constructor() {
    super(MetricType.MEMORY_USAGE, 0, {
      fetchAndStore: false,
      interval: 1000 * 5, // 5 seconds
    });
  }

  public async collect(): Promise<Point | undefined> {
    return this.getPointBase().floatField("value", heapSize() / (1024 * 1024));
  }
}
