import { Point } from "@influxdata/influxdb-client";
import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { MetricType } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class ActiveAccountsMetric extends NumberMetric {
  constructor() {
    super(MetricType.ACTIVE_ACCOUNTS, 0, {
      fetchAndStore: false,
      interval: 1000 * 60 * 5, // 5 minutes
    });
  }

  public async collect(): Promise<Point | undefined> {
    const count = await ApiServiceRegistry.getInstance()
      .getScoreSaberService()
      .lookupActivePlayerCount();
    if (count === undefined) {
      return undefined;
    }
    return this.getPointBase().intField("value", count ?? 0);
  }
}
