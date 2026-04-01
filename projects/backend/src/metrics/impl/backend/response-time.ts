import { Histogram } from "prom-client";
import { MetricType, prometheusRegistry } from "../../../service/infra/metrics.service";
import Metric from "../../metric";

export default class ResponseTimeHistogramMetric extends Metric<number> {
  private histogram: Histogram;

  constructor() {
    super(MetricType.RESPONSE_TIME_MS, 0);

    this.histogram = new Histogram({
      name: "response_time_ms",
      help: "Per-route response time in milliseconds",
      labelNames: ["route"],
      // Buckets in milliseconds.
      buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2000, 5000, 10000],
      registers: [prometheusRegistry],
    });
  }

  public observe(route: string, durationMs: number) {
    this.value = durationMs;
    this.histogram.observe({ route }, durationMs);
  }
}
