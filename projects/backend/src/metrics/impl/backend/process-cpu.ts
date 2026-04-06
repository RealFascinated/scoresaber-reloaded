import os from "node:os";
import { Gauge } from "prom-client";
import { MetricType, prometheusRegistry } from "../../../service/infra/metrics.service";
import NumberMetric from "../../number-metric";

export default class ProcessCpuMetric extends NumberMetric {
  private lastCpuUsage = process.cpuUsage();
  private lastAt = Date.now();
  private readonly cpuCores = Math.max(1, (os.availableParallelism?.() ?? os.cpus().length) || 1);

  constructor() {
    super(MetricType.PROCESS_CPU, 0, { persist: false });

    const cpuPercentGauge = new Gauge({
      name: "process_cpu_percent",
      help: "Process CPU usage percentage since the previous metric collection",
      registers: [prometheusRegistry],
      collect: () => {
        const now = Date.now();
        const elapsedMs = now - this.lastAt;
        if (elapsedMs <= 0) {
          cpuPercentGauge.set(this.value);
          return;
        }

        const delta = process.cpuUsage(this.lastCpuUsage);
        this.lastCpuUsage = process.cpuUsage();
        this.lastAt = now;

        const usedCpuMs = (delta.user + delta.system) / 1000;
        const percent = ((usedCpuMs / elapsedMs) * 100) / this.cpuCores;
        cpuPercentGauge.set(percent);
        this.value = percent;
      },
    });
  }
}
