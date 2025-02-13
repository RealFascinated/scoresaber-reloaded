import { Point } from "@influxdata/influxdb-client";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { MetricType } from "../../service/metrics.service";
import NumberMetric from "../number-metric";

export default class ActiveAccountsMetric extends NumberMetric {
  constructor() {
    super(MetricType.ACTIVE_ACCOUNTS, 0, {
      fetchAfterRegister: false,
    });
  }

  public async collect(): Promise<Point> {
    return this.getPointBase().intField("value", await scoresaberService.lookupActivePlayerCount());
  }
}
