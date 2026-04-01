import { Gauge } from "prom-client";
import { MetricType, prometheusRegistry } from "../../../service/infra/metrics.service";
import NumberMetric from "../../number-metric";

export default class ProcessCpuMetric extends NumberMetric {
  private readonly startedAt = Date.now();
  private readonly startedUsage = process.cpuUsage();

  constructor() {
    super(MetricType.PROCESS_CPU, 0);

    const cpuPercentGauge = new Gauge({
      name: "process_cpu_percent",
      help: "Process CPU usage percentage since process start",
      registers: [prometheusRegistry],
      collect: () => {
        const elapsedMs = Date.now() - this.startedAt;
        if (elapsedMs <= 0) {
          cpuPercentGauge.set(0);
          return;
        }

        const usage = process.cpuUsage(this.startedUsage);
        const usedCpuMs = (usage.user + usage.system) / 1000;
        const percent = (usedCpuMs / elapsedMs) * 100;
        cpuPercentGauge.set(percent);
        this.value = percent;
      },
    });

  }
}
