import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { Gauge } from "prom-client";
import { MetricType, prometheusRegistry } from "../../../service/metrics.service";
import { ScoreSaberApiService } from "../../../service/scoresaber-api.service";
import NumberMetric from "../../number-metric";

export class ApiServicesMetric extends NumberMetric {
  constructor() {
    super(MetricType.API_SERVICES, 0);

    const gauge = new Gauge({
      name: "api_service_calls_total",
      help: "Total number of API service calls",
      labelNames: ["service"],
      registers: [prometheusRegistry],
      collect: () => {
        for (const [name, service] of ApiServiceRegistry.getInstance().getAllServices()) {
          const totalCalls = service.getCallCount();
          gauge.set({ service: name }, totalCalls);
        }
        gauge.set({ service: "scoresaber" }, ScoreSaberApiService.totalRequests);
      },
    });
  }
}
