import { Point } from "@influxdata/influxdb-client";
import os from "os";
import pidusage from "pidusage";
import { MetricType } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class CpuUsageMetric extends NumberMetric {
  constructor() {
    super(MetricType.CPU_USAGE, 0, {
      fetchAfterRegister: false,
      interval: 1000 * 10, // 10 seconds
    });
  }

  public async collect(): Promise<Point | undefined> {
    const stats = await pidusage(process.pid);
    const cpuCores = os.cpus().length;
    const normalizedCpu = stats.cpu / cpuCores;
    return this.getPointBase().floatField("value", normalizedCpu);
  }
}
