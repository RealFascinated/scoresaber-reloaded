import { Point } from "@influxdata/influxdb-client";
import { MetricType } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class RequestsPerSecondMetric extends NumberMetric {
  private lastCheck: number = performance.now();
  public requestCount: number = 0;

  constructor() {
    super(MetricType.REQUESTS_PER_SECOND, 0, {
      fetchAfterRegister: false,
      interval: 1000, // Check every second
    });
  }

  public async collect(): Promise<Point | undefined> {
    const now = performance.now();
    const elapsedSeconds = (now - this.lastCheck) / 1000;

    // Calculate requests per second
    const rps = this.requestCount / elapsedSeconds;

    // Reset for next interval
    this.lastCheck = now;
    this.requestCount = 0;

    const point = this.getPointBase();
    point.floatField("rps", rps);

    return point;
  }

  public increment() {
    this.requestCount++;
  }
}
