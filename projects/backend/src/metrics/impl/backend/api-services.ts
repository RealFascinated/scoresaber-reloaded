import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { Gauge } from "prom-client";
import { MetricType, prometheusRegistry } from "../../../service/metrics.service";
import { ScoreSaberApiService } from "../../../service/scoresaber-api.service";
import NumberMetric from "../../number-metric";

export class ApiServicesMetric extends NumberMetric {
  constructor() {
    super(MetricType.API_SERVICES, 0);

    const callsGauge = new Gauge({
      name: "api_service_calls_total",
      help: "Total number of API service calls",
      labelNames: ["service"],
      registers: [prometheusRegistry],
      collect: () => {
        let totalCalls = 0;
        for (const [name, service] of ApiServiceRegistry.getInstance().getAllServices()) {
          const serviceCalls = service.getCallCount();
          totalCalls += serviceCalls;
          callsGauge.set({ service: name }, serviceCalls);
        }
        totalCalls += ScoreSaberApiService.totalRequests;
        callsGauge.set({ service: "scoresaber" }, ScoreSaberApiService.totalRequests);
        this.value = totalCalls;
      },
    });

    const failuresGauge = new Gauge({
      name: "api_service_failures_total",
      help: "Total number of failed API service calls",
      labelNames: ["service"],
      registers: [prometheusRegistry],
      collect: () => {
        for (const [name, service] of ApiServiceRegistry.getInstance().getAllServices()) {
          failuresGauge.set({ service: name }, service.getFailedCallCount());
        }
        failuresGauge.set({ service: "scoresaber" }, ScoreSaberApiService.failedRequests);
      },
    });

    const averageLatencyGauge = new Gauge({
      name: "api_service_average_latency_ms",
      help: "Average API service latency in milliseconds",
      labelNames: ["service"],
      registers: [prometheusRegistry],
      collect: () => {
        for (const [name, service] of ApiServiceRegistry.getInstance().getAllServices()) {
          averageLatencyGauge.set({ service: name }, service.getAverageLatencyMs());
        }
        averageLatencyGauge.set({ service: "scoresaber" }, ScoreSaberApiService.getAverageLatencyMs());
      },
    });
  }
}
