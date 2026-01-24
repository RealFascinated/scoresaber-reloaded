import { Point } from "@influxdata/influxdb3-client";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { MetricType } from "../../../service/metrics.service";
import { ScoreSaberApiService } from "../../../service/scoresaber-api.service";
import NumberMetric from "../../number-metric";

export default class ActiveAccountsMetric extends NumberMetric {
  constructor() {
    super(MetricType.ACTIVE_ACCOUNTS, 0, {
      fetchAndStore: false,
      interval: TimeUnit.toMillis(TimeUnit.Minute, 1),
    });
  }

  public async collect(): Promise<Point | undefined> {
    const count = await ScoreSaberApiService.lookupActivePlayerCount();
    if (count === undefined) {
      return undefined;
    }
    this.value = count;
    return this.getPointBase().setIntegerField("value", count ?? 0);
  }
}
