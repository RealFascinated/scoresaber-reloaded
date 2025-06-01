import { Point } from "@influxdata/influxdb-client";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { MetricType } from "../../service/metrics.service";
import NumberMetric from "../number-metric";

export default class ActiveAccountsMetric extends NumberMetric {
  constructor() {
    super(MetricType.ACTIVE_ACCOUNTS, 0, {
      fetchAfterRegister: false,
      interval: 1000 * 60 * 5, // 5 minutes
    });
  }

  public async collect(): Promise<Point> {
    const count = await scoresaberService.lookupActivePlayerCount();
    return this.getPointBase().intField("value", count ?? 0);
  }
}
