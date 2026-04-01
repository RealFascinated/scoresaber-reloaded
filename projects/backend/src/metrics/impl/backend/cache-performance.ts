import { Counter, Gauge } from "prom-client";
import { MetricType, prometheusRegistry } from "../../../service/infra/metrics.service";
import NumberMetric from "../../number-metric";

export default class CachePerformanceMetric extends NumberMetric {
  private static readonly cacheHitsByNamespace = new Map<string, number>();
  private static readonly cacheMissesByNamespace = new Map<string, number>();
  private static readonly cacheHitsCounter = new Counter({
    name: "cache_hits_total",
    help: "Total cache hits by cache namespace",
    labelNames: ["cache_id", "mode"],
    registers: [prometheusRegistry],
  });
  private static readonly cacheMissesCounter = new Counter({
    name: "cache_misses_total",
    help: "Total cache misses by cache namespace",
    labelNames: ["cache_id", "mode"],
    registers: [prometheusRegistry],
  });
  private static readonly cacheHitRatioGauge = new Gauge({
    name: "cache_hit_ratio",
    help: "Cache hit ratio by cache namespace",
    labelNames: ["cache_id", "mode"],
    registers: [prometheusRegistry],
  });

  constructor() {
    super(MetricType.CACHE_PERFORMANCE, 0);
  }

  public static recordHit(cacheId: string, mode: "REDIS" | "MEMORY"): void {
    this.cacheHitsCounter.inc({ cache_id: cacheId, mode });
    const hits = (this.cacheHitsByNamespace.get(cacheId) ?? 0) + 1;
    const misses = this.cacheMissesByNamespace.get(cacheId) ?? 0;
    this.cacheHitsByNamespace.set(cacheId, hits);
    this.cacheHitRatioGauge.set({ cache_id: cacheId, mode }, hits / (hits + misses));
  }

  public static recordMiss(cacheId: string, mode: "REDIS" | "MEMORY"): void {
    this.cacheMissesCounter.inc({ cache_id: cacheId, mode });
    const hits = this.cacheHitsByNamespace.get(cacheId) ?? 0;
    const misses = (this.cacheMissesByNamespace.get(cacheId) ?? 0) + 1;
    this.cacheMissesByNamespace.set(cacheId, misses);
    this.cacheHitRatioGauge.set({ cache_id: cacheId, mode }, hits / (hits + misses));
  }
}
