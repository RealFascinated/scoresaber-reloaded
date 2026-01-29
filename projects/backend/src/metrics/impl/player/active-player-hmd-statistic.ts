import { Gauge } from "prom-client";
import { MetricType, prometheusRegistry } from "../../../service/metrics.service";
import { PlayerHmdService } from "../../../service/player/player-hmd.service";
import NumberMetric from "../../number-metric";

export default class ActivePlayerHmdStatisticMetric extends NumberMetric {
  constructor() {
    super(MetricType.ACTIVE_PLAYERS_HMD_STATISTIC, 0);

    const gauge = new Gauge({
      name: "active_players_hmd",
      help: "Number of active players by HMD type",
      labelNames: ["hmd"],
      registers: [prometheusRegistry],
      collect: async () => {
        const hmdUsage = await PlayerHmdService.getActiveHmdUsage();
        for (const [hmd, count] of Object.entries(hmdUsage)) {
          gauge.set({ hmd }, count);
        }
      },
    });
  }
}
