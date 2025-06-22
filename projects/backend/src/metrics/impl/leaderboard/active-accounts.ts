import { Point } from "@influxdata/influxdb-client";
import { ScoreSaberLeaderboardModel } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { MetricType } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class MapAuthorsMetric extends NumberMetric {
  constructor() {
    super(MetricType.MAP_AUTHORS, 0, {
      fetchAndStore: false,
      interval: TimeUnit.toMillis(TimeUnit.Minute, 1),
    });
  }

  public async collect(): Promise<Point | undefined> {
    const mapAuthors = await ScoreSaberLeaderboardModel.aggregate([
      {
        $group: {
          _id: "$levelAuthorName",
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          count: -1,
        },
      },
      {
        $limit: 100,
      },
    ]);

    const point = this.getPointBase();
    for (const author of mapAuthors) {
      if (author._id && author.count > 0) {
        point.intField(author._id, author.count);
      }
    }
    return point;
  }
}
