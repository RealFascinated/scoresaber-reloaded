import Metric from "../metric";
import { Point } from "@influxdata/influxdb-client";
import { ScoreSaberLeaderboardModel } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";

export default class ScoresaberLeaderboardsMetric extends Metric {
  constructor() {
    super("cached-scoresaber-leaderboards");
  }

  async collect(): Promise<Point> {
    return this.getPointBase().intField("count", await ScoreSaberLeaderboardModel.estimatedDocumentCount({}));
  }
}
