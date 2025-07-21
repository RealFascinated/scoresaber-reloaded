import { Point } from "@influxdata/influxdb-client";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { getMidnightAlignedDate, TimeUnit } from "@ssr/common/utils/time-utils";
import { MetricType } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class UniqueDailyPlayersMetric extends NumberMetric {
  constructor() {
    super(MetricType.UNIQUE_DAILY_PLAYERS, 0, {
      fetchAndStore: false,
      interval: TimeUnit.toMillis(TimeUnit.Minute, 1),
    });
  }

  public async collect(): Promise<Point | undefined> {
    const statsResponse = await ScoreSaberScoreModel.aggregate([
      { $match: { timestamp: { $gte: getMidnightAlignedDate(new Date()) } } },
      {
        $facet: {
          uniquePlayers: [{ $group: { _id: "$playerId" } }, { $count: "uniquePlayers" }],
        },
      },
    ]).hint({ timestamp: -1 }); // Force use of pure timestamp index

    const uniquePlayersCount = statsResponse[0]?.uniquePlayers?.[0]?.uniquePlayers ?? 0;
    return this.getPointBase().intField("value", uniquePlayersCount);
  }
}
