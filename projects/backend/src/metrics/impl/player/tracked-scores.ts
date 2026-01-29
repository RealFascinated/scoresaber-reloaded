import { Gauge } from "prom-client";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { MetricType } from "../../../service/metrics.service";
import { prometheusRegistry } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class TrackedScoresMetric extends NumberMetric {
  private gauge: Gauge;

  constructor() {
    super(MetricType.TRACKED_SCORES, 0, {
      interval: TimeUnit.toMillis(TimeUnit.Second, 1),
    });

    this.gauge = new Gauge({
      name: "tracked_scores",
      help: "Number of tracked scores",
      registers: [prometheusRegistry],
      collect: () => {
        this.gauge.set(this.value ?? 0);
      },
    });
  }
}
