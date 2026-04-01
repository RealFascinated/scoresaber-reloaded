import { getMidnightAlignedDate } from "@ssr/common/utils/time-utils";
import { Gauge } from "prom-client";
import { ScoreSaberAccountsRepository } from "../../../repositories/scoresaber-accounts.repository";
import { MetricType, prometheusRegistry } from "../../../service/infra/metrics.service";
import NumberMetric from "../../number-metric";

export default class DailyNewAccountsMetric extends NumberMetric {
  constructor() {
    super(MetricType.DAILY_NEW_ACCOUNTS, 0);

    const gauge = new Gauge({
      name: "daily_new_accounts",
      help: "Number of new accounts created today",
      registers: [prometheusRegistry],
      collect: async () => {
        gauge.set(await ScoreSaberAccountsRepository.countJoinedSince(getMidnightAlignedDate(new Date())));
      },
    });
  }
}
