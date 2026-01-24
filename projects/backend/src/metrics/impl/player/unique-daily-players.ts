import { Point } from "@influxdata/influxdb3-client";
import { getMidnightAlignedDate, TimeUnit } from "@ssr/common/utils/time-utils";
import { MetricType } from "../../../service/metrics.service";
import Metric from "../../metric";

type UniqueDailyPlayersData = {
  lastScore: Date;
  playerIds: string[];
};

export default class UniqueDailyPlayersMetric extends Metric<UniqueDailyPlayersData> {
  constructor() {
    super(
      MetricType.UNIQUE_DAILY_PLAYERS,
      {
        lastScore: getMidnightAlignedDate(new Date()),
        playerIds: [],
      },
      {
        fetchAndStore: true,
        interval: TimeUnit.toMillis(TimeUnit.Minute, 1),
      }
    );
  }

  public collect(): Promise<Point | undefined> {
    return Promise.resolve(this.getPointBase().setIntegerField("value", this.value.playerIds.length));
  }
}
