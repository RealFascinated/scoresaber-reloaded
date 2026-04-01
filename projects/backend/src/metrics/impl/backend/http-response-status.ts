import { Counter } from "prom-client";
import { MetricType, prometheusRegistry } from "../../../service/infra/metrics.service";
import Metric from "../../metric";

export default class HttpResponseStatusMetric extends Metric<null> {
  private readonly counter: Counter<"route" | "status_class">;

  constructor() {
    super(MetricType.HTTP_RESPONSES, null, { persist: false });

    this.counter = new Counter({
      name: "http_responses_total",
      help: "HTTP responses grouped by route and status class",
      labelNames: ["route", "status_class"],
      registers: [prometheusRegistry],
    });
  }

  public increment(route: string, statusCode: number): void {
    this.counter.inc({
      route,
      status_class: `${Math.floor(statusCode / 100)}xx`,
    });
  }
}
