import { PlayerModel } from "@ssr/common/model/player/player";
import { getMidnightAlignedDate } from "@ssr/common/utils/time-utils";
import { Gauge } from "prom-client";
import { MetricType, prometheusRegistry } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class DailyNewAccountsMetric extends NumberMetric {
  constructor() {
    super(MetricType.DAILY_NEW_ACCOUNTS, 0);

    const gauge = new Gauge({
      name: "daily_new_accounts",
      help: "Number of new accounts created today",
      registers: [prometheusRegistry],
      collect: async () => {
        const count = await PlayerModel.countDocuments({
          joinedDate: { $gte: getMidnightAlignedDate(new Date()) }, // Today
        });
        gauge.set(count);
      },
    });
  }
}
