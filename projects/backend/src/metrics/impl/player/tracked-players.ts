import { PlayerModel } from "@ssr/common/model/player/player";
import { Gauge } from "prom-client";
import { MetricType, prometheusRegistry } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class TrackedPlayersMetric extends NumberMetric {
  constructor() {
    super(MetricType.TRACKED_PLAYERS, 0);

    const totalGauge = new Gauge({
      name: "tracked_players_total",
      help: "Total number of tracked players",
      registers: [prometheusRegistry],
      collect: async () => {
        const count = await PlayerModel.estimatedDocumentCount();
        totalGauge.set(count ?? 0);
      },
    });

    const inactiveGauge = new Gauge({
      name: "tracked_players_inactive",
      help: "Number of inactive tracked players",
      registers: [prometheusRegistry],
      collect: async () => {
        const inactiveCount = await PlayerModel.countDocuments({ inactive: true });
        inactiveGauge.set(inactiveCount ?? 0);
      },
    });
  }
}
