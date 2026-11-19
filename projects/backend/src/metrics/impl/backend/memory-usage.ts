import { Gauge } from "@prometheus-io/client";
import NumberMetric from "../../number-metric";
import { MetricType, prometheusRegistry } from "../../prometheus";

export default class MemoryUsageMetric extends NumberMetric {
  constructor() {
    super(MetricType.MEMORY_USAGE, 0, { persist: false });

    const heapSizeGauge = new Gauge({
      name: "memory_usage_heap_size_bytes",
      help: "Heap size in bytes",
      registers: [prometheusRegistry],
      collect: () => {
        heapSizeGauge.set(process.memoryUsage().heapUsed);
      },
    });

    const heapCapacityGauge = new Gauge({
      name: "memory_usage_heap_capacity_bytes",
      help: "Heap capacity in bytes",
      registers: [prometheusRegistry],
      collect: () => {
        heapCapacityGauge.set(process.memoryUsage().heapTotal);
      },
    });

    const rssGauge = new Gauge({
      name: "memory_usage_rss_bytes",
      help: "Resident set size in bytes",
      registers: [prometheusRegistry],
      collect: () => {
        rssGauge.set(process.memoryUsage().rss);
      },
    });
  }
}
