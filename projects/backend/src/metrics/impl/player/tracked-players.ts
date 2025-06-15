import { Point } from "@influxdata/influxdb-client";
import { PlayerModel } from "@ssr/common/model/player";
import { MetricType } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class TrackedPlayersMetric extends NumberMetric {
  constructor() {
    super(MetricType.TRACKED_PLAYERS, 0, {
      fetchAndStore: false,
      interval: 1000 * 60 * 5, // 5 minutes
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
