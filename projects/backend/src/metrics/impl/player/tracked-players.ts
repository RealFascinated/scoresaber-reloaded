import { Point } from "@influxdata/influxdb-client";
import { PlayerModel } from "@ssr/common/model/player/player";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { MetricType } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class TrackedPlayersMetric extends NumberMetric {
  constructor() {
    super(MetricType.TRACKED_PLAYERS, 0, {
      fetchAndStore: false,
      interval: TimeUnit.toMillis(TimeUnit.Minute, 1),
    });
  }

  public async collect(): Promise<Point | undefined> {
    const count = await PlayerModel.estimatedDocumentCount();
    const inactiveCount = await PlayerModel.countDocuments({ inactive: true });

    return this.getPointBase()
      .intField("value", count ?? 0)
      .intField("inactive", inactiveCount ?? 0);
  }
}
