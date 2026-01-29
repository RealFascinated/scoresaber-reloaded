import { Gauge } from "prom-client";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { MetricType } from "../../../service/metrics.service";
import { prometheusRegistry } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class ProcessUptimeMetric extends NumberMetric {
  private gauge: Gauge;

  constructor() {
    super(MetricType.PROCESS_UPTIME, 0, {
      interval: TimeUnit.toMillis(TimeUnit.Minute, 1),
    });

    this.gauge = new Gauge({
      name: "process_uptime_seconds",
      help: "Process uptime in seconds",
      registers: [prometheusRegistry],
      collect: () => {
        this.gauge.set(process.uptime());
      },
    });
  }
}
