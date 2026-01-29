import { PlayerModel } from "@ssr/common/model/player/player";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { Gauge } from "prom-client";
import { MetricType, prometheusRegistry } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class TrackedPlayersMetric extends NumberMetric {
  private totalGauge: Gauge;
  private inactiveGauge: Gauge;

  constructor() {
    super(MetricType.TRACKED_PLAYERS, 0, {
      interval: TimeUnit.toMillis(TimeUnit.Minute, 1),
    });

    this.totalGauge = new Gauge({
      name: "tracked_players_total",
      help: "Total number of tracked players",
      registers: [prometheusRegistry],
      collect: async () => {
        const count = await PlayerModel.estimatedDocumentCount();
        this.totalGauge.set(count ?? 0);
      },
    });

    this.inactiveGauge = new Gauge({
      name: "tracked_players_inactive",
      help: "Number of inactive tracked players",
      registers: [prometheusRegistry],
      collect: async () => {
        const inactiveCount = await PlayerModel.countDocuments({ inactive: true });
        this.inactiveGauge.set(inactiveCount ?? 0);
      },
    });
  }
}
