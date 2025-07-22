import { Point } from "@influxdata/influxdb-client";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { getMidnightAlignedDate, TimeUnit } from "@ssr/common/utils/time-utils";
import { MetricType } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class HmdStatisticMetric extends NumberMetric {
  constructor() {
    super(MetricType.DAILY_HMD_STATISTIC, 0, {
      fetchAndStore: false,
      interval: TimeUnit.toMillis(TimeUnit.Minute, 1),
    });
  }

  public async collect(): Promise<Point | undefined> {
    const stats = await ScoreSaberScoreModel.aggregate([
      {
        $match: {
          timestamp: { $gte: getMidnightAlignedDate(new Date()) },
          hmd: { $nin: [null, "Unknown"] },
        },
      },
      { $group: { _id: "$hmd", count: { $sum: 1 } } },
    ]);

    const point = this.getPointBase();
    for (const stat of stats) {
      if (stat._id) {
        point.intField(`${stat._id}`, stat.count);
      }
    }
    return point;
  }
}
