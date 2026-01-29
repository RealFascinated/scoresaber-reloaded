import { getMidnightAlignedDate, TimeUnit } from "@ssr/common/utils/time-utils";
import { Gauge } from "prom-client";
import { MetricType, prometheusRegistry } from "../../../service/metrics.service";
import Metric from "../../metric";

type UniqueDailyPlayersData = {
  lastScore: Date;
  playerIds: string[];
};

export default class UniqueDailyPlayersMetric extends Metric<UniqueDailyPlayersData> {
  private gauge: Gauge;

  constructor() {
    super(
      MetricType.UNIQUE_DAILY_PLAYERS,
      {
        lastScore: getMidnightAlignedDate(new Date()),
        playerIds: [],
      },
      {
        interval: TimeUnit.toMillis(TimeUnit.Minute, 1),
      }
    );

    this.gauge = new Gauge({
      name: "unique_daily_players",
      help: "Number of unique daily players",
      registers: [prometheusRegistry],
      collect: () => {
        this.gauge.set(this.value.playerIds.length);
      },
    });
  }
}
