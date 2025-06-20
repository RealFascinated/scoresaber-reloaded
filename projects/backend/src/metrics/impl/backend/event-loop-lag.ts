import { Point } from "@influxdata/influxdb-client";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { MetricType } from "../../../service/metrics.service";
import Metric from "../../metric";

export default class EventLoopLagMetric extends Metric<number> {
  private lastCheck: number;
  private lag: number;
  private measureInterval: NodeJS.Timeout | null = null;

  constructor() {
    super(MetricType.EVENT_LOOP_LAG, 0, {
      fetchAndStore: false,
      interval: TimeUnit.toMillis(TimeUnit.Second, 1),
    });

    this.lastCheck = Date.now();
    this.lag = 0;
    this.startMeasuring();
  }

  private startMeasuring() {
    this.measureInterval = setInterval(() => {
      const now = Date.now();
      const expected = this.lastCheck + 1000; // We expect 1 second between measurements
      this.lag = Math.max(0, now - expected);
      this.lastCheck = now;
    }, 1000);
  }

  async collect(): Promise<Point> {
    // Update the metric value
    this.value = this.lag;

    // Create a point for InfluxDB using the base point
    return this.getPointBase().floatField("lag_ms", this.lag);
  }

  public cleanup() {
    if (this.measureInterval) {
      clearInterval(this.measureInterval);
      this.measureInterval = null;
    }
  }
}
