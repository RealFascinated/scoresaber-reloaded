import { TimeUnit } from "@ssr/common/utils/time-utils";
import { Gauge } from "prom-client";
import { MetricType, prometheusRegistry } from "../../../service/metrics.service";
import { PlayerHmdService } from "../../../service/player/player-hmd.service";
import NumberMetric from "../../number-metric";

export default class ActivePlayerHmdStatisticMetric extends NumberMetric {
  private gauge: Gauge<string>;

  constructor() {
    super(MetricType.ACTIVE_PLAYERS_HMD_STATISTIC, 0, {
      interval: TimeUnit.toMillis(TimeUnit.Minute, 1),
    });

    this.gauge = new Gauge({
      name: "active_players_hmd",
      help: "Number of active players by HMD type",
      labelNames: ["hmd"],
      registers: [prometheusRegistry],
      collect: async () => {
        const hmdUsage = await PlayerHmdService.getActiveHmdUsage();
        for (const [hmd, count] of Object.entries(hmdUsage)) {
          this.gauge.set({ hmd }, count);
        }
      },
    });
  }
}
