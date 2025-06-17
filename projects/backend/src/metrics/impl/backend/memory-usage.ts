import { Point } from "@influxdata/influxdb-client";
import { memoryUsage } from "node:process";
import { MetricType } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class MemoryUsageMetric extends NumberMetric {
  constructor() {
    super(MetricType.MEMORY_USAGE, 0, {
      fetchAndStore: false,
      interval: 1000 * 10, // 10 seconds
    });
  }

  public async collect(): Promise<Point | undefined> {
    const stats = memoryUsage();
    const point = this.getPointBase();

    // Convert bytes to MB for better readability
    point.floatField("value", stats.heapUsed / (1024 * 1024));
    point.floatField("totalHeap", stats.heapTotal / (1024 * 1024));

    return point;
  }
}
