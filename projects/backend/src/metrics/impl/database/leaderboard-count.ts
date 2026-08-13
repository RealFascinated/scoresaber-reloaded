import { Gauge } from "prom-client";
import { ScoreSaberLeaderboardsRepository } from "../../../repositories/scoresaber-leaderboards.repository";
import NumberMetric from "../../number-metric";
import { MetricType, prometheusRegistry } from "../../prometheus";

export default class LeaderboardCountMetric extends NumberMetric {
  constructor() {
    super(MetricType.LEADERBOARD_COUNT, 0, {
      persist: false,
    });

    const gauge = new Gauge({
      name: "leaderboard_count",
      help: "Total number of leaderboards stored in the database",
      registers: [prometheusRegistry],
      collect: async () => {
        const total = await ScoreSaberLeaderboardsRepository.countTotal();
        gauge.set(total);
      },
    });
  }
}
