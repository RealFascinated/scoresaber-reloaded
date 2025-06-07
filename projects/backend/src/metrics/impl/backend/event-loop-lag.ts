import { Point } from "@influxdata/influxdb-client";
import { MetricType } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class EventLoopLagMetric extends NumberMetric {
  private lastCheck: number = Date.now();

  constructor() {
    super(MetricType.EVENT_LOOP_LAG, 0, {
      fetchAfterRegister: false,
      interval: 1000, // Check every second for more accurate lag detection
    });
  }

  public async collect(): Promise<Point | undefined> {
    const now = Date.now();
    const lag = now - this.lastCheck - this.options.interval;
    this.lastCheck = now;

    const point = this.getPointBase();
    point.floatField("lag_ms", Math.max(0, lag)); // Ensure we don't report negative lag

    return point;
  }
}
