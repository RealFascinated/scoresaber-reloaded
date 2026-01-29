import { Gauge } from "prom-client";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { MetricType } from "../../../service/metrics.service";
import { prometheusRegistry } from "../../../service/metrics.service";
import Metric from "../../metric";

export default class EventLoopLagMetric extends Metric<number> {
  private lastCheck: number;
  private lag: number;
  private measureInterval: NodeJS.Timeout | null = null;
  private gauge: Gauge;

  constructor() {
    super(MetricType.EVENT_LOOP_LAG, 0, {
      interval: TimeUnit.toMillis(TimeUnit.Second, 1),
    });

    this.lastCheck = Date.now();
    this.lag = 0;

    this.gauge = new Gauge({
      name: "event_loop_lag_ms",
      help: "Event loop lag in milliseconds",
      registers: [prometheusRegistry],
      collect: () => {
        this.gauge.set(this.lag);
      },
    });

    this.startMeasuring();
  }

  private startMeasuring() {
    this.measureInterval = setInterval(() => {
      const now = Date.now();
      const expected = this.lastCheck + 1000; // We expect 1 second between measurements
      this.lag = Math.max(0, now - expected);
      this.lastCheck = now;
      this.value = this.lag;
    }, 1000);
  }

  public cleanup() {
    if (this.measureInterval) {
      clearInterval(this.measureInterval);
      this.measureInterval = null;
    }
  }
}
