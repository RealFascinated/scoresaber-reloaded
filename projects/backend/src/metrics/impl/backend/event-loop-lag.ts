import { Gauge } from "@prometheus-io/client";
import Metric from "../../metric";
import { MetricType, prometheusRegistry } from "../../prometheus";

const SAMPLE_INTERVAL_MS = 100;

export default class EventLoopLagMetric extends Metric<number> {
  private lastCheck: number;
  private lag: number;
  private maxLagSinceCollect = 0;
  private measureInterval: NodeJS.Timeout | null = null;

  constructor() {
    super(MetricType.EVENT_LOOP_LAG, 0, { persist: false });

    this.lastCheck = performance.now();
    this.lag = 0;

    const gauge = new Gauge({
      name: "event_loop_lag_ms",
      help: "Max event loop lag in milliseconds since the previous scrape",
      registers: [prometheusRegistry],
      collect: () => {
        gauge.set(this.maxLagSinceCollect);
        this.maxLagSinceCollect = 0;
      },
    });

    this.startMeasuring();
  }

  private startMeasuring() {
    this.measureInterval = setInterval(() => {
      const now = performance.now();
      const expected = this.lastCheck + SAMPLE_INTERVAL_MS;
      this.lag = Math.max(0, now - expected);
      this.maxLagSinceCollect = Math.max(this.maxLagSinceCollect, this.lag);
      this.lastCheck = now;
      this.value = this.lag;
    }, SAMPLE_INTERVAL_MS);
  }

  public cleanup() {
    if (this.measureInterval) {
      clearInterval(this.measureInterval);
      this.measureInterval = null;
    }
  }
}
