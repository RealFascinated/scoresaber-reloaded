import { Point } from "@influxdata/influxdb-client";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import os from "os";
import pidusage from "pidusage";
import { MetricType } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class ProcessCpuUsageMetric extends NumberMetric {
  constructor() {
    super(MetricType.PROCESS_CPU_USAGE, 0, {
      fetchAndStore: false,
      interval: TimeUnit.toMillis(TimeUnit.Second, 1),
    });
  }

  public async collect(): Promise<Point | undefined> {
    const stats = await pidusage(process.pid);
    const cpuCores = os.cpus().length;
    const normalizedCpu = stats.cpu / cpuCores;

    return this.getPointBase().floatField("value", normalizedCpu);
  }
}
