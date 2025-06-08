import { Point } from "@influxdata/influxdb-client";
import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { MetricType } from "../../../service/metrics.service";
import Metric from "../../metric";

interface ServiceStats {
  lastCount: number;
  lastTime: number;
}

export class ApiServiceCallRateMetric extends Metric<{ [serviceName: string]: number }> {
  private serviceStats: Map<string, ServiceStats> = new Map();

  constructor() {
    super(
      MetricType.SERVICE_CALL_RATE,
      {},
      {
        interval: 1000, // Collect every second
        fetchAfterRegister: false,
      }
    );
  }

  public async collect(): Promise<Point | undefined> {
    const now = performance.now();
    const point = this.getPointBase();
    const rates: { [key: string]: number } = {};

    for (const [name, service] of ApiServiceRegistry.getAllServices()) {
      const currentCount = service.getCallCount();
      const stats = this.serviceStats.get(name) || { lastCount: currentCount, lastTime: now };
      const timeDiff = (now - stats.lastTime) / 1000; // Convert to seconds
      const countDiff = currentCount - stats.lastCount;
      const callsPerSecond = timeDiff > 0 ? countDiff / timeDiff : 0;

      point.floatField(name, callsPerSecond);
      rates[name] = callsPerSecond;

      this.serviceStats.set(name, { lastCount: currentCount, lastTime: now });
    }

    this.value = rates;
    return point;
  }
}
