import { Gauge } from "prom-client";
import NumberMetric from "../../number-metric";
import { MetricType, prometheusRegistry } from "../../prometheus";

export default class ProcessUptimeMetric extends NumberMetric {
  constructor() {
    super(MetricType.PROCESS_UPTIME, 0, { persist: false });

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
