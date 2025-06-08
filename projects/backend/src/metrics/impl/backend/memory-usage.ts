import { Point } from "@influxdata/influxdb-client";
import pidusage from "pidusage";
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
    const stats = await pidusage(process.pid);
    const point = this.getPointBase();

    // Convert bytes to MB for better readability
    point.floatField("value", stats.memory / (1024 * 1024));

    return point;
  }
}
