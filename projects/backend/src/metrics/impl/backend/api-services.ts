import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { Gauge } from "prom-client";
import { MetricType, prometheusRegistry } from "../../../service/metrics.service";
import { ScoreSaberApiService } from "../../../service/scoresaber-api.service";
import NumberMetric from "../../number-metric";

export class ApiServicesMetric extends NumberMetric {
  private gauge: Gauge<string>;

  constructor() {
    super(MetricType.API_SERVICES, 0, {
      interval: TimeUnit.toMillis(TimeUnit.Second, 1),
    });

    this.gauge = new Gauge({
      name: "api_service_calls_total",
      help: "Total number of API service calls",
      labelNames: ["service"],
      registers: [prometheusRegistry],
      collect: () => {
        // Update gauges for each service
        for (const [name, service] of ApiServiceRegistry.getInstance().getAllServices()) {
          const totalCalls = service.getCallCount();
          this.gauge.set({ service: name }, totalCalls);
        }

        // Update ScoreSaber gauge
        this.gauge.set({ service: "scoresaber" }, ScoreSaberApiService.totalRequests);
      },
    });
  }
}
