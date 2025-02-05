import Metric from "../metric";
import { Point } from "@influxdata/influxdb-client";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";

export default class TrackedScoresMetric extends Metric {
  constructor() {
    super("tracked-scores");
  }

  async collect(): Promise<Point> {
    return this.getPointBase().intField(
      "count",
      await ScoreSaberScoreModel.estimatedDocumentCount({})
    );
  }
}
