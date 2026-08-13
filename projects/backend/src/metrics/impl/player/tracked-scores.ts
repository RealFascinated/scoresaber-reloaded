import { Gauge } from "prom-client";
import NumberMetric from "../../number-metric";
import { MetricType, prometheusRegistry } from "../../prometheus";

export default class TrackedScoresMetric extends NumberMetric {
  constructor() {
    super(MetricType.TRACKED_SCORES, 0);

    const gauge = new Gauge({
      name: "tracked_scores",
      help: "Number of tracked scores",
      registers: [prometheusRegistry],
      collect: () => {
        gauge.set(this.value ?? 0);
      },
    });
  }
}
