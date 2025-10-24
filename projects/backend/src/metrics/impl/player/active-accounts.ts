import { Point } from "@influxdata/influxdb-client";
import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { MetricType } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class ActiveAccountsMetric extends NumberMetric {
  constructor() {
    super(MetricType.ACTIVE_ACCOUNTS, 0, {
      fetchAndStore: false,
      interval: TimeUnit.toMillis(TimeUnit.Minute, 1),
    });
  }

  public async collect(): Promise<Point | undefined> {
    const count = await ApiServiceRegistry.getInstance()
      .getScoreSaberService()
      .lookupActivePlayerCount();
    if (count === undefined) {
      return undefined;
    }
    this.value = count;
    return this.getPointBase().intField("value", count ?? 0);
  }
}
