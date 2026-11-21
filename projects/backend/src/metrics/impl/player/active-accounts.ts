import { Gauge } from "@prometheus-io/client";
import Logger from "@ssr/common/logger";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { ScoreSaberApiService } from "../../../service/external/scoresaber-api.service";
import NumberMetric from "../../number-metric";
import { MetricType, prometheusRegistry } from "../../prometheus";

const metricLog = Logger.withTopic("Active Accounts Metric");

export default class ActiveAccountsMetric extends NumberMetric {
  constructor() {
    super(MetricType.ACTIVE_ACCOUNTS, 0);

    setInterval(
      async () => {
        const result = await ScoreSaberApiService.lookupActivePlayerCount();
        if (!result.ok) {
          metricLog.warn(`Failed to look up active player count: ${result.message}`);
          return;
        }
        this.value = result.response;
      },
      TimeUnit.toMillis(TimeUnit.Minute, 1)
    );

    const gauge = new Gauge({
      name: "active_accounts",
      help: "Number of active accounts",
      registers: [prometheusRegistry],
      collect: async () => {
        gauge.set(this.value ?? 0);
      },
    });
  }
}
