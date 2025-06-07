import { Point } from "@influxdata/influxdb-client";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { MetricType } from "../../service/metrics.service";
import NumberMetric from "../number-metric";

export default class HmdStatisticMetric extends NumberMetric {
  constructor() {
    super(MetricType.HMD_STATISTIC, 0, {
      fetchAfterRegister: false,
      interval: 1000 * 60 * 5, // 5 minutes
    });
  }

  public async collect(): Promise<Point | undefined> {
    // Get all scores from the last 24 hours
    const scores = await ScoreSaberScoreModel.find({
      timestamp: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
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
    console.log(point.toString());
    return point;
  }
}
