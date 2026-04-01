import { Gauge } from "prom-client";
import { MetricType, prometheusRegistry } from "../../../service/infra/metrics.service";
import { PlayerScoreHistoryService } from "../../../service/player/player-score-history.service";
import { PlayerScoresService } from "../../../service/player/player-scores.service";
import NumberMetric from "../../number-metric";

export default class TotalTrackedScoresMetric extends NumberMetric {
  constructor() {
    super(MetricType.TOTAL_TRACKED_SCORES, 0);

    const totalScoresGauge = new Gauge({
      name: "total_tracked_scores",
      help: "Total number of tracked scores",
      registers: [prometheusRegistry],
      collect: async () => {
        const total = await PlayerScoresService.getTotalScoresCount();
        totalScoresGauge.set(total);
      },
    });

    const totalPreviousScoresGauge = new Gauge({
      name: "total_tracked_previous_scores",
      help: "Total number of tracked previous scores",
      registers: [prometheusRegistry],
      collect: async () => {
        const totalPrevious = await PlayerScoreHistoryService.getTotalPreviousScoresCount();
        totalPreviousScoresGauge.set(totalPrevious);
      },
    });
  }
}
