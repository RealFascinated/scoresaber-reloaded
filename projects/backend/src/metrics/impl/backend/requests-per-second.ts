import { Point } from "@influxdata/influxdb-client";
import { MetricType } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class RequestsPerSecondMetric extends NumberMetric {
  constructor() {
    super(MetricType.REQUESTS_PER_SECOND, 0, {
      fetchAfterRegister: false,
      interval: 1000, // Check every second
    });
  }

  public async collect(): Promise<Point | undefined> {
    return this.getPointBase().floatField("total_requests", this.value);
  }
}
