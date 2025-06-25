import { Point } from "@influxdata/influxdb-client";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { MetricType } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

interface LatencyEntry {
  value: number;
  timestamp: number;
}

interface LatencyData {
  entries: LatencyEntry[];
  readonly maxSize: number;
  readonly maxAge: number; // Maximum age in milliseconds
}

export default class RouteLatencyMetric extends NumberMetric {
  private routeLatencies: Map<string, LatencyData> = new Map();
  private overallLatencies: LatencyData;
  private readonly maxAge = 5 * 60 * 1000; // Clear data older than 5 minutes

  constructor() {
    super(MetricType.ROUTE_LATENCY, 0, {
      fetchAndStore: false,
      interval: TimeUnit.toMillis(TimeUnit.Second, 1),
    });

    this.overallLatencies = {
      entries: [],
      maxSize: 25, // last 25 entries per route
      maxAge: this.maxAge,
    };
  }

  private cleanupOldEntries(data: LatencyData): void {
    const now = Date.now();
    data.entries = data.entries.filter(entry => now - entry.timestamp <= data.maxAge);
  }

  private addLatencyEntry(data: LatencyData, value: number): void {
    const now = Date.now();

    // Clean up old entries first
    this.cleanupOldEntries(data);

    // Add new entry
    data.entries.push({ value, timestamp: now });

    // Maintain size limit
    if (data.entries.length > data.maxSize) {
      data.entries.shift(); // Remove oldest entry
    }
  }

  private calculateAverage(entries: LatencyEntry[]): number {
    if (entries.length === 0) return 0;
    return entries.reduce((sum, entry) => sum + entry.value, 0) / entries.length;
  }

  public async collect(): Promise<Point | undefined> {
    const point = this.getPointBase();

    // Record metrics for each route
    for (const [route, data] of this.routeLatencies.entries()) {
      // Clean up old data
      this.cleanupOldEntries(data);

      if (data.entries.length === 0) continue;

      // Calculate and record rolling average for the route
      const avgLatency = this.calculateAverage(data.entries);
      point.floatField(`${route}`, avgLatency);
    }

    // Calculate and record overall rolling average
    this.cleanupOldEntries(this.overallLatencies);
    const overallAvg = this.calculateAverage(this.overallLatencies.entries);
    point.floatField("overall_rolling_avg", overallAvg);

    return point;
  }

  public recordLatency(route: string, method: string, latency: number) {
    // Validate input
    if (latency < 0 || !Number.isFinite(latency)) {
      console.warn(`Invalid latency value: ${latency} for route ${method} ${route}`);
      return;
    }

    const key = `${method} ${route}`;
    let data = this.routeLatencies.get(key);

    if (!data) {
      data = {
        entries: [],
        maxSize: 50,
        maxAge: this.maxAge,
      };
      this.routeLatencies.set(key, data);
    }

    // Update route's rolling window
    this.addLatencyEntry(data, latency);

    // Update overall rolling window
    this.addLatencyEntry(this.overallLatencies, latency);
  }
}
