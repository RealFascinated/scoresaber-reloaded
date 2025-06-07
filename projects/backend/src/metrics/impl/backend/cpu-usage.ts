import { Point } from "@influxdata/influxdb-client";
import pidusage from "pidusage";
import { MetricType } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class CpuUsageMetric extends NumberMetric {
  constructor() {
    super(MetricType.CPU_USAGE, 0, {
      fetchAfterRegister: false,
      interval: 1000 * 30, // 30 seconds
    });
  }

  public async collect(): Promise<Point | undefined> {
    const stats = await pidusage(process.pid);
    return this.getPointBase().floatField("value", stats.cpu);
  }
}
