import { Point } from "@influxdata/influxdb-client";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { MetricType } from "../../../service/metrics.service";
import Metric from "../../metric";

export default class TotalRequestsPerEndpointMetric extends Metric<Record<string, number>> {
  constructor() {
    super(
      MetricType.TOTAL_REQUESTS_PER_ENDPOINT,
      {},
      {
        fetchAndStore: false,
        interval: TimeUnit.toMillis(TimeUnit.Second, 1),
      }
    );
  }

  public increment(endpoint: string) {
    this.value[endpoint] = (this.value[endpoint] ?? 0) + 1;
  }

  public async collect(): Promise<Point | undefined> {
    const point = this.getPointBase();
    for (const [endpoint, count] of Object.entries(this.value)) {
      point.intField(endpoint, count);
    }
    return point;
  }
}
