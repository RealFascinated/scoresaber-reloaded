import { Gauge } from "prom-client";
import { ScoreSaberAccountsRepository } from "../../../repositories/scoresaber-accounts.repository";
import { MetricType, prometheusRegistry } from "../../../service/infra/metrics.service";
import NumberMetric from "../../number-metric";

export default class TrackedPlayersMetric extends NumberMetric {
  constructor() {
    super(MetricType.TRACKED_PLAYERS, 0);

    const totalGauge = new Gauge({
      name: "tracked_players_total",
      help: "Total number of tracked players",
      registers: [prometheusRegistry],
      collect: async () => {
        totalGauge.set(await ScoreSaberAccountsRepository.countTotal());
      },
    });

    const inactiveGauge = new Gauge({
      name: "tracked_players_inactive",
      help: "Number of inactive tracked players",
      registers: [prometheusRegistry],
      collect: async () => {
        inactiveGauge.set(await ScoreSaberAccountsRepository.countInactive());
      },
    });
  }
}
