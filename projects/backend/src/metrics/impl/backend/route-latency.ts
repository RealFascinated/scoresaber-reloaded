import { Point } from "@influxdata/influxdb-client";
import { app } from "../../../index";
import { MetricType } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

interface LatencyData {
  sum: number;
  count: number;
}

export default class RouteLatencyMetric extends NumberMetric {
  private routeLatencies: Map<string, LatencyData> = new Map();

  constructor() {
    super(MetricType.ROUTE_LATENCY, 0, {
      fetchAfterRegister: false,
      interval: 1000, // Check every second
    });

    // Initialize all routes from the app
    for (const route of app.routes) {
      const key = `${route.method} ${route.path}`;
      this.routeLatencies.set(key, { sum: 0, count: 0 });
    }
  }

  public async collect(): Promise<Point | undefined> {
    const point = this.getPointBase();

    // Record metrics for each route
    for (const [route, data] of this.routeLatencies.entries()) {
      if (data.count === 0) continue;

      // Calculate and record average
      const avgLatency = data.sum / data.count;
      point.floatField(`${route}`, avgLatency);

      // Reset for next interval
      this.routeLatencies.set(route, { sum: 0, count: 0 });
    }

    return point;
  }

  public recordLatency(route: string, method: string, latency: number) {
    const key = `${method} ${route}`;
    let data = this.routeLatencies.get(key);

    if (!data) {
      data = { sum: 0, count: 0 };
      this.routeLatencies.set(key, data);
    }

    // Update sum and count
    data.sum += latency;
    data.count += 1;
  }
}
