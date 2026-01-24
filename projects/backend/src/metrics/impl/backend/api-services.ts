import { Point } from "@influxdata/influxdb3-client";
import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { MetricType } from "../../../service/metrics.service";
import { ScoreSaberApiService } from "../../../service/scoresaber-api.service";
import NumberMetric from "../../number-metric";

export class ApiServicesMetric extends NumberMetric {
  constructor() {
    super(MetricType.API_SERVICES, 0, {
      fetchAndStore: true,
      interval: TimeUnit.toMillis(TimeUnit.Second, 1),
    });
  }

  public async collect(): Promise<Point | undefined> {
    const point = this.getPointBase();

    for (const [name, service] of ApiServiceRegistry.getInstance().getAllServices()) {
      const totalCalls = service.getCallCount();
      point.setFloatField(name, totalCalls);
    }

    point.setFloatField("scoresaber", ScoreSaberApiService.totalRequests);
    return point;
  }
}
