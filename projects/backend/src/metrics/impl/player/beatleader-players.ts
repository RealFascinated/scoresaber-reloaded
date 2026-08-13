import { Gauge } from "prom-client";
import { BeatLeaderApiService } from "../../../service/external/beatleader-api.service";
import NumberMetric from "../../number-metric";
import { MetricType, prometheusRegistry } from "../../prometheus";

export default class BeatLeaderPlayersMetric extends NumberMetric {
  constructor() {
    super(MetricType.BEATLEADER_PLAYERS, 0);

    const gauge = new Gauge({
      name: "beatleader_players",
      help: "Total number of BeatLeader players",
      registers: [prometheusRegistry],
      collect: async () => {
        const total = await BeatLeaderApiService.lookupPlayersTotal();
        if (typeof total === "number" && Number.isFinite(total)) {
          this.value = total;
        }
        gauge.set(this.value ?? 0);
      },
    });
  }
}
