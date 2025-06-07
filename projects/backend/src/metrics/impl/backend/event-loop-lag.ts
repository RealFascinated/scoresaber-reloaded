import { Point } from "@influxdata/influxdb-client";
import { MetricType } from "../../../service/metrics.service";
import Metric from "../../metric";

export default class EventLoopLagMetric extends Metric<number> {
  private lastCheck: number;
  private lag: number;

  constructor() {
    super(MetricType.EVENT_LOOP_LAG, 0, {
      fetchAfterRegister: false,
      interval: 1000,
    });

    this.lastCheck = Date.now();
    this.lag = 0;
    this.startMeasuring();
  }

  private startMeasuring() {
    const measure = () => {
      const now = Date.now();
      const expected = this.lastCheck + 1000; // We expect 1 second between measurements
      this.lag = Math.max(0, now - expected);
      this.lastCheck = now;

      // Schedule next measurement
      setTimeout(measure, 1000);
    };

    // Start measuring
    measure();
  }

  async collect(): Promise<Point> {
    // Update the metric value
    this.value = this.lag;

    // Create a point for InfluxDB using the base point
    return this.getPointBase().floatField("lag_ms", this.lag);
  }
}
