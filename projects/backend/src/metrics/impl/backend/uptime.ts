import { Point } from "@influxdata/influxdb3-client";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { MetricType } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class ProcessUptimeMetric extends NumberMetric {
  constructor() {
    super(MetricType.PROCESS_UPTIME, 0, {
      fetchAndStore: false,
      interval: TimeUnit.toMillis(TimeUnit.Minute, 1),
    });
  }

  public async collect(): Promise<Point | undefined> {
    return this.getPointBase().setFloatField("value", process.uptime());
  }
}
