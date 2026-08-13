import { Gauge } from "prom-client";
import NumberMetric from "../../number-metric";
import { MetricType, prometheusRegistry } from "../../prometheus";

export default class BeatLeaderSeenScoresMetric extends NumberMetric {
  constructor() {
    super(MetricType.BEATLEADER_SEEN_SCORES, 0);

    const gauge = new Gauge({
      name: "beatleader_seen_scores",
      help: "Number of BeatLeader scores seen from websocket",
      registers: [prometheusRegistry],
      collect: () => {
        gauge.set(this.value ?? 0);
      },
    });
  }
}
