import { Point } from "@influxdata/influxdb-client";
import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { MetricType } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export class ApiServiceCallRateMetric extends NumberMetric {
  constructor() {
    super(MetricType.SERVICE_CALL_RATE, 0, {
      interval: 1000, // Collect every second
      fetchAfterRegister: false,
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
