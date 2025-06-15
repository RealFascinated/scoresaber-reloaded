import { Point } from "@influxdata/influxdb-client";
import { PlayerModel } from "@ssr/common/model/player";
import { MetricType } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class ActivePlayerHmdStatisticMetric extends NumberMetric {
  constructor() {
    super(MetricType.ACTIVE_PLAYERS_HMD_STATISTIC, 0, {
      fetchAndStore: false,
      interval: 1000 * 60 * 5, // 5 minutes
    });
  }

  public async collect(): Promise<Point | undefined> {
    const playerHmds = await PlayerModel.find({
      inactive: false,
    }).select("hmd");

    const hmds = new Map<string, number>();
    for (const player of playerHmds) {
      if (player.hmd && player.hmd !== "Unknown") {
        hmds.set(player.hmd, (hmds.get(player.hmd) ?? 0) + 1);
      }
    }

    const point = this.getPointBase();
    for (const [hmd, count] of hmds) {
      point.intField(`${hmd}`, count);
    }
    return point;
  }
}
