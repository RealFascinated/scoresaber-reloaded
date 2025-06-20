import { Point } from "@influxdata/influxdb-client";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { heapSize } from "bun:jsc";
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
    return this.getPointBase().floatField("value", heapSize() / (1024 * 1024));
  }
}
