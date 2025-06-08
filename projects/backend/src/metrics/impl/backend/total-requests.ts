import { Point } from "@influxdata/influxdb-client";
import { MetricType } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class RequestsPerSecondMetric extends NumberMetric {
  constructor() {
    super(MetricType.TOTAL_REQUESTS, 0, {
      fetchAndStore: true,
      interval: 1000, // Check every second
    });
  }

  public async collect(): Promise<Point | undefined> {
    return this.getPointBase().floatField("total_requests", this.value);
  }
}
