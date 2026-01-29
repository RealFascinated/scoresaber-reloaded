import { Gauge } from "prom-client";
import { PlayerModel } from "@ssr/common/model/player/player";
import { getMidnightAlignedDate, TimeUnit } from "@ssr/common/utils/time-utils";
import { MetricType } from "../../../service/metrics.service";
import { prometheusRegistry } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class DailyNewAccountsMetric extends NumberMetric {
  private gauge: Gauge;

  constructor() {
    super(MetricType.DAILY_NEW_ACCOUNTS, 0, {
      interval: TimeUnit.toMillis(TimeUnit.Minute, 1),
    });

    this.gauge = new Gauge({
      name: "daily_new_accounts",
      help: "Number of new accounts created today",
      registers: [prometheusRegistry],
      collect: async () => {
        const count = await PlayerModel.countDocuments({
          joinedDate: { $gte: getMidnightAlignedDate(new Date()) }, // Today
        });
        this.gauge.set(count);
      },
    });
  }
}
