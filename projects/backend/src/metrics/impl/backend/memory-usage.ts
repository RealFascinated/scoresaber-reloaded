import { TimeUnit } from "@ssr/common/utils/time-utils";
import { heapStats } from "bun:jsc";
import { Gauge } from "prom-client";
import { MetricType, prometheusRegistry } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class MemoryUsageMetric extends NumberMetric {
  private heapSizeGauge: Gauge;
  private heapCapacityGauge: Gauge;

  constructor() {
    super(MetricType.MEMORY_USAGE, 0, {
      interval: TimeUnit.toMillis(TimeUnit.Second, 1),
    });

    this.heapSizeGauge = new Gauge({
      name: "memory_usage_heap_size_bytes",
      help: "Heap size in bytes",
      registers: [prometheusRegistry],
      collect: () => {
        const stats = heapStats();
        this.heapSizeGauge.set(stats.heapSize);
      },
    });

    this.heapCapacityGauge = new Gauge({
      name: "memory_usage_heap_capacity_bytes",
      help: "Heap capacity in bytes",
      registers: [prometheusRegistry],
      collect: () => {
        const stats = heapStats();
        this.heapCapacityGauge.set(stats.heapCapacity);
      },
    });
  }
}
