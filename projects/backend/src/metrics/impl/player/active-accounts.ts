import { TimeUnit } from "@ssr/common/utils/time-utils";
import { Gauge } from "prom-client";
import { MetricType, prometheusRegistry } from "../../../service/metrics.service";
import { ScoreSaberApiService } from "../../../service/scoresaber-api.service";
import NumberMetric from "../../number-metric";

export default class ActiveAccountsMetric extends NumberMetric {
  private gauge: Gauge;

  constructor() {
    super(MetricType.ACTIVE_ACCOUNTS, 0, {
      interval: TimeUnit.toMillis(TimeUnit.Minute, 1),
    });

    this.gauge = new Gauge({
      name: "active_accounts",
      help: "Number of active accounts",
      registers: [prometheusRegistry],
      collect: async () => {
        const count = await ScoreSaberApiService.lookupActivePlayerCount();
        if (count !== undefined) {
          this.value = count;
          this.gauge.set(count ?? 0);
        }
      },
    });
  }
}
