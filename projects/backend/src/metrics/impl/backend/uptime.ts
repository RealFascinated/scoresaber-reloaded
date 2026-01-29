import { Gauge } from "prom-client";
import { MetricType, prometheusRegistry } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class ProcessUptimeMetric extends NumberMetric {
  constructor() {
    super(MetricType.PROCESS_UPTIME, 0);

    const gauge = new Gauge({
      name: "process_uptime_seconds",
      help: "Process uptime in seconds",
      registers: [prometheusRegistry],
      collect: () => {
        gauge.set(process.uptime());
      },
    });
  }
}
