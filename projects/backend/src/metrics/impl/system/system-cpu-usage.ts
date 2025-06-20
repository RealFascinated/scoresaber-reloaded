import { Point } from "@influxdata/influxdb-client";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import systeminformation from "systeminformation";
import { MetricType } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class SystemCpuUsageMetric extends NumberMetric {
  constructor() {
    super(MetricType.SYSTEM_CPU_USAGE, 0, {
      fetchAndStore: false,
      interval: TimeUnit.toMillis(TimeUnit.Second, 1),
    });
  }

  public async collect(): Promise<Point | undefined> {
    const systemCpu = await systeminformation.currentLoad();

    return this.getPointBase()
      .floatField("total", systemCpu.currentLoad)
      .floatField("guest", systemCpu.currentLoadGuest)
      .floatField("system", systemCpu.currentLoadSystem)
      .floatField("nice", systemCpu.currentLoadNice)
      .floatField("steal", systemCpu.currentLoadSteal)
      .floatField("user", systemCpu.currentLoadUser);
  }
}
