import { Point } from "@influxdata/influxdb-client";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { MetricType } from "../../../service/metrics.service";
import { PlayerService } from "../../../service/player/player.service";
import NumberMetric from "../../number-metric";

export default class ActivePlayerHmdStatisticMetric extends NumberMetric {
  constructor() {
    super(MetricType.ACTIVE_PLAYERS_HMD_STATISTIC, 0, {
      fetchAndStore: false,
      interval: TimeUnit.toMillis(TimeUnit.Minute, 1),
    });
  }

  public async collect(): Promise<Point | undefined> {
    const hmdUsage = await PlayerService.getActiveHmdUsage();
    const point = this.getPointBase();
    for (const [hmd, count] of Object.entries(hmdUsage)) {
      point.intField(hmd, count);
    }
    return point;
  }
}
