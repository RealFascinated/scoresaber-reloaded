import { Point } from "@influxdata/influxdb-client";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { MetricType } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

interface LatencyData {
  recentLatencies: Array<{ value: number; timestamp: number }>;
  readonly windowSize: number;
  readonly maxAge: number; // Maximum age in milliseconds
}

export default class RouteLatencyMetric extends NumberMetric {
  private routeLatencies: Map<string, LatencyData> = new Map();
  private recentLatencies: number[] = [];
  private readonly windowSize = 100; // Store last 100 latencies for overall rolling average
  private readonly routeWindowSize = 50; // Store last 50 latencies per route
  private readonly maxAge = 5 * 60 * 1000; // Clear data older than 5 minutes

  constructor() {
    super(MetricType.ROUTE_LATENCY, 0, {
      fetchAndStore: false,
      interval: TimeUnit.toMillis(TimeUnit.Second, 1),
    });
  }

  private calculateRollingAverage(
    latencies: Array<{ value: number; timestamp: number }>,
    maxAge: number
  ): number {
    const now = Date.now();
    const validLatencies = latencies.filter(l => now - l.timestamp <= maxAge);

    if (validLatencies.length === 0) return 0;
    return validLatencies.reduce((sum, l) => sum + l.value, 0) / validLatencies.length;
  }

  public async collect(): Promise<Point | undefined> {
    const point = this.getPointBase();
    const now = Date.now();

    // Record metrics for each route
    for (const [route, data] of this.routeLatencies.entries()) {
      // Clean up old data
      data.recentLatencies = data.recentLatencies.filter(l => now - l.timestamp <= data.maxAge);

      if (data.recentLatencies.length === 0) continue;

      // Calculate and record rolling average for the route
      const avgLatency = this.calculateRollingAverage(data.recentLatencies, data.maxAge);
      point.floatField(`${route}`, avgLatency);
    }

    // Calculate and record overall rolling average
    const rollingAvg =
      this.recentLatencies.length > 0
        ? this.recentLatencies.reduce((a, b) => a + b, 0) / this.recentLatencies.length
        : 0;
    point.floatField("overall_rolling_avg", rollingAvg);

    return point;
  }

  public recordLatency(route: string, method: string, latency: number) {
    const key = `${method} ${route}`;
    let data = this.routeLatencies.get(key);
    const now = Date.now();

    if (!data) {
      data = {
        recentLatencies: [],
        windowSize: this.routeWindowSize,
        maxAge: this.maxAge,
      };
      this.routeLatencies.set(key, data);
    }

    // Update route's rolling window
    data.recentLatencies.push({ value: latency, timestamp: now });
    if (data.recentLatencies.length > data.windowSize) {
      data.recentLatencies.shift(); // Remove oldest latency
    }

    // Update overall rolling window
    this.recentLatencies.push(latency);
    if (this.recentLatencies.length > this.windowSize) {
      this.recentLatencies.shift(); // Remove oldest latency
    }
  }
}
