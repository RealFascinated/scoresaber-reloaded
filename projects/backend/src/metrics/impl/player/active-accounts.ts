import { TimeUnit } from "@ssr/common/utils/time-utils";
import { Gauge } from "prom-client";
import { MetricType, prometheusRegistry } from "../../../service/metrics.service";
import { ScoreSaberApiService } from "../../../service/scoresaber-api.service";
import NumberMetric from "../../number-metric";

export default class ActiveAccountsMetric extends NumberMetric {
  constructor() {
    super(MetricType.ACTIVE_ACCOUNTS, 0);

    setInterval(
      async () => {
        const count = await ScoreSaberApiService.lookupActivePlayerCount();
        if (count !== undefined) {
          this.value = count;
        }
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
