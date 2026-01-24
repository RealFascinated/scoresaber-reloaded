import { Point } from "@influxdata/influxdb3-client";
import { PlayerModel } from "@ssr/common/model/player/player";
import { getMidnightAlignedDate, TimeUnit } from "@ssr/common/utils/time-utils";
import { MetricType } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class DailyNewAccountsMetric extends NumberMetric {
  constructor() {
    super(MetricType.DAILY_NEW_ACCOUNTS, 0, {
      fetchAndStore: false,
      interval: TimeUnit.toMillis(TimeUnit.Minute, 1),
    });
  }

  public async collect(): Promise<Point | undefined> {
    const count = await PlayerModel.countDocuments({
      joinedDate: { $gte: getMidnightAlignedDate(new Date()) }, // Today
    });
    return this.getPointBase().setIntegerField("value", count);
  }
}
