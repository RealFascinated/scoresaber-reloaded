import { Point } from "@influxdata/influxdb-client";
import { MetricType } from "../../../service/metrics.service";
import Metric from "../../metric";

type HttpStatusCodes = Record<number, number>;

export default class HttpStatusCodesMetric extends Metric<HttpStatusCodes> {
  constructor() {
    super(
      MetricType.HTTP_STATUS_CODES,
      {},
      {
        fetchAndStore: true,
        interval: 1000, // Check every second
      }
    );
  }

  public async collect(): Promise<Point | undefined> {
    const point = this.getPointBase();

    // Record counts for each status code
    for (const [statusCode, count] of Object.entries(this.value)) {
      point.intField(`${statusCode}`, count);
    }

    return point;
  }

  public recordStatusCode(statusCode: number) {
    this.value[statusCode] = (this.value[statusCode] ?? 0) + 1;
  }
}
