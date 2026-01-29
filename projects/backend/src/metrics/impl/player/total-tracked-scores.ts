import { ScoreSaberPreviousScoreModel } from "@ssr/common/model/score/impl/scoresaber-previous-score";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { Gauge } from "prom-client";
import { MetricType, prometheusRegistry } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class TotalTrackedScoresMetric extends NumberMetric {
  constructor() {
    super(MetricType.TOTAL_TRACKED_SCORES, 0);

    const totalScoresGauge = new Gauge({
      name: "total_tracked_scores",
      help: "Total number of tracked scores",
      registers: [prometheusRegistry],
      collect: async () => {
        const total = await ScoreSaberScoreModel.estimatedDocumentCount();
        totalScoresGauge.set(total);
      },
    });

    const totalPreviousScoresGauge = new Gauge({
      name: "total_tracked_previous_scores",
      help: "Total number of tracked previous scores",
      registers: [prometheusRegistry],
      collect: async () => {
        const totalPrevious = await ScoreSaberPreviousScoreModel.estimatedDocumentCount();
        totalPreviousScoresGauge.set(totalPrevious);
      },
    });
  }
}
