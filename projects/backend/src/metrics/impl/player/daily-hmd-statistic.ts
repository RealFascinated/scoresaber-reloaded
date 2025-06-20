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
    const scores = await ScoreSaberScoreModel.find({
      timestamp: { $gte: getMidnightAlignedDate(new Date()) }, // Today
    }).select("hmd");
    const hmds = new Map<string, number>();
    for (const score of scores) {
      if (score.hmd && score.hmd !== "Unknown") {
        hmds.set(score.hmd, (hmds.get(score.hmd) ?? 0) + 1);
      }
    }

    const point = this.getPointBase();
    for (const [hmd, count] of hmds) {
      point.intField(`${hmd}`, count);
    }
    return point;
  }
}
