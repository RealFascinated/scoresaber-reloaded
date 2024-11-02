import Metric from "../metric";
import { Point } from "@influxdata/influxdb-client";
import { AdditionalScoreDataModel } from "@ssr/common/model/additional-score-data/additional-score-data";

export default class BeatLeaderDataStatsMetric extends Metric {
  constructor() {
    super("beatleader-score-data");
  }

  async collect(): Promise<Point> {
    return this.getPointBase().intField("count", await AdditionalScoreDataModel.countDocuments({}));
  }
}
