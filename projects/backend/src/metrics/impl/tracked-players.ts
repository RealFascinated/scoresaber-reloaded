import Metric from "../metric";
import { PlayerModel } from "@ssr/common/model/player";
import { Point } from "@influxdata/influxdb-client";

export default class TrackedPlayersMetric extends Metric {
  constructor() {
    super("tracked-players");
  }

  async collect(): Promise<Point> {
    return this.getPointBase().intField("count", await PlayerModel.countDocuments({}));
  }
}
