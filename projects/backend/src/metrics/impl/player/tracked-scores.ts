import { Gauge } from "prom-client";
import { MetricType, prometheusRegistry } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

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
