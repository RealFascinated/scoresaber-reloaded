import { Point } from "@influxdata/influxdb-client";
import { PlayerModel } from "@ssr/common/model/player";
import { getMidnightAlignedDate } from "@ssr/common/utils/time-utils";
import { MetricType } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class DailyNewAccountsMetric extends NumberMetric {
  constructor() {
    super(MetricType.DAILY_NEW_ACCOUNTS, 0, {
      fetchAndStore: false,
      interval: 1000 * 60 * 5, // 5 minutes
    });
  }

  public async collect(): Promise<Point | undefined> {
    const count = await PlayerModel.countDocuments({
      joinedDate: { $gte: getMidnightAlignedDate(new Date()) }, // Today
    });
    console.log(`[DailyNewAccountsMetric] Collecting metric for today: ${count}`);
    return this.getPointBase().intField("value", count);
  }
}
