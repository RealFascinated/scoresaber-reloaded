import { Point } from "@influxdata/influxdb-client";
import { ScoreSaberPreviousScoreModel } from "@ssr/common/model/score/impl/scoresaber-previous-score";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { MetricType } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class TotalTrackedScoresMetric extends NumberMetric {
  constructor() {
    super(MetricType.TOTAL_TRACKED_SCORES, 0, {
      fetchAndStore: false,
      interval: TimeUnit.toMillis(TimeUnit.Minute, 1),
    });
  }

  public async collect(): Promise<Point | undefined> {
    const total = await ScoreSaberScoreModel.estimatedDocumentCount();
    const totalPrevious = await ScoreSaberPreviousScoreModel.estimatedDocumentCount();

    return this.getPointBase()
      .floatField("totalScores", total)
      .floatField("totalPreviousScores", totalPrevious);
  }
}
