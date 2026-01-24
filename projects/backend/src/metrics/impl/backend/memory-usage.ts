import { Point } from "@influxdata/influxdb3-client";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { heapStats } from "bun:jsc";
import { MetricType } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class MemoryUsageMetric extends NumberMetric {
  constructor() {
    super(MetricType.MEMORY_USAGE, 0, {
      fetchAndStore: false,
      interval: TimeUnit.toMillis(TimeUnit.Second, 1),
    });
  }

  public async collect(): Promise<Point | undefined> {
    const stats = heapStats();

    return this.getPointBase()
      .setFloatField("value", stats.heapSize / (1024 * 1024))
      .setFloatField("total", stats.heapCapacity / (1024 * 1024));
  }
}
