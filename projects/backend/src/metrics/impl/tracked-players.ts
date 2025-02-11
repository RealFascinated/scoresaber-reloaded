import { Point } from "@influxdata/influxdb-client";
import { MetricType } from "../../service/metrics.service";
import NumberMetric from "../number-metric";
import { PlayerModel } from "@ssr/common/model/player";

export default class TrackedPlayersMetric extends NumberMetric {
  constructor() {
    super(MetricType.TRACKED_PLAYERS, 0, {
      fetchAfterRegister: false,
    });
  }

  public async collect(): Promise<Point> {
    return this.getPointBase().intField("value", await PlayerModel.estimatedDocumentCount());
  }
}
