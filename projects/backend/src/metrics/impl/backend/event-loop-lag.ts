import { Point } from "@influxdata/influxdb-client";
import { MetricType } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class EventLoopLagMetric extends NumberMetric {
  private lastCheck: number = performance.now();
  private lastLag: number = 0;

  constructor() {
    super(MetricType.EVENT_LOOP_LAG, 0, {
      fetchAfterRegister: false,
      interval: 1000, // Check every second for more accurate lag detection
    });
  }

  public async collect(): Promise<Point | undefined> {
    const now = performance.now();
    const actualInterval = now - this.lastCheck;

    // Calculate the lag as the difference between actual and expected interval
    // This gives us a more accurate measure of event loop blocking
    const lag = Math.max(0, actualInterval - this.options.interval);

    // Store the current time for next measurement
    this.lastCheck = now;

    // Smooth out spikes by averaging with the last measurement
    this.lastLag = (this.lastLag + lag) / 2;

    const point = this.getPointBase();
    point.floatField("lag_ms", this.lastLag);

    return point;
  }
}
