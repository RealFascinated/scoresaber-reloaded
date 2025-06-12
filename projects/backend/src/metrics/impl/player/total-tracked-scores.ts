import { Point } from "@influxdata/influxdb-client";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { MetricType } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class TrackedScoresMetric extends NumberMetric {
  constructor() {
    super(MetricType.TOTAL_TRACKED_SCORES, 0, {
      fetchAndStore: false,
      interval: 1000 * 60 * 2, // 2 minutes
    });
  }

  public async collect(): Promise<Point | undefined> {
    const total = await ScoreSaberScoreModel.estimatedDocumentCount();

    return this.getPointBase().floatField("value", total);
  }
}
