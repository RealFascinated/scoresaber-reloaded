import { Point } from "@influxdata/influxdb-client";
import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { MetricType } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export class ApiServicesMetric extends NumberMetric {
  constructor() {
    super(MetricType.API_SERVICES, 0, {
      fetchAndStore: true,
      interval: 1000, // Collect every second
    });
  }

  public async collect(): Promise<Point | undefined> {
    const point = this.getPointBase();

    for (const [name, service] of ApiServiceRegistry.getInstance().getAllServices()) {
      const totalCalls = service.getCallCount();
      point.floatField(name, totalCalls);
    }
    return point;
  }
}
