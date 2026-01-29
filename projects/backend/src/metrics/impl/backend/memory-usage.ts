import { heapStats } from "bun:jsc";
import { Gauge } from "prom-client";
import { MetricType, prometheusRegistry } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class MemoryUsageMetric extends NumberMetric {
  constructor() {
    super(MetricType.MEMORY_USAGE, 0);

    const heapSizeGauge = new Gauge({
      name: "memory_usage_heap_size_bytes",
      help: "Heap size in bytes",
      registers: [prometheusRegistry],
      collect: () => {
        const stats = heapStats();
        heapSizeGauge.set(stats.heapSize);
      },
    });

    const heapCapacityGauge = new Gauge({
      name: "memory_usage_heap_capacity_bytes",
      help: "Heap capacity in bytes",
      registers: [prometheusRegistry],
      collect: () => {
        const stats = heapStats();
        heapCapacityGauge.set(stats.heapCapacity);
      },
    });
  }
}
