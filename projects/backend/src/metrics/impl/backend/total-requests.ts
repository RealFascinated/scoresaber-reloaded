import { Point } from "@influxdata/influxdb3-client";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { MetricType } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class RequestsPerSecondMetric extends NumberMetric {
  constructor() {
    super(MetricType.TOTAL_REQUESTS, 0, {
      fetchAndStore: true,
      interval: TimeUnit.toMillis(TimeUnit.Second, 1),
    });
  }

  public async collect(): Promise<Point | undefined> {
    return this.getPointBase().setFloatField("total_requests", this.value);
  }
}
