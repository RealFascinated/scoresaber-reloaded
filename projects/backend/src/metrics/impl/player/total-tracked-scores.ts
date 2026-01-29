import { Gauge } from "prom-client";
import { ScoreSaberPreviousScoreModel } from "@ssr/common/model/score/impl/scoresaber-previous-score";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { MetricType } from "../../../service/metrics.service";
import { prometheusRegistry } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class TotalTrackedScoresMetric extends NumberMetric {
  private totalScoresGauge: Gauge;
  private totalPreviousScoresGauge: Gauge;

  constructor() {
    super(MetricType.TOTAL_TRACKED_SCORES, 0, {
      interval: TimeUnit.toMillis(TimeUnit.Minute, 1),
    });

    this.totalScoresGauge = new Gauge({
      name: "total_tracked_scores",
      help: "Total number of tracked scores",
      registers: [prometheusRegistry],
      collect: async () => {
        const total = await ScoreSaberScoreModel.estimatedDocumentCount();
        this.totalScoresGauge.set(total);
      },
    });

    this.totalPreviousScoresGauge = new Gauge({
      name: "total_tracked_previous_scores",
      help: "Total number of tracked previous scores",
      registers: [prometheusRegistry],
      collect: async () => {
        const totalPrevious = await ScoreSaberPreviousScoreModel.estimatedDocumentCount();
        this.totalPreviousScoresGauge.set(totalPrevious);
      },
    });
  }
}
