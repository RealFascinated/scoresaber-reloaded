import { Counter } from "prom-client";
import NumberMetric from "../../number-metric";
import { MetricType, prometheusRegistry } from "../../prometheus";

export default class TotalRequestsMetric extends NumberMetric {
  private counter: Counter;

  constructor() {
    super(MetricType.TOTAL_REQUESTS, 0);

    this.counter = new Counter({
      name: "total_requests",
      help: "Total number of requests",
      registers: [prometheusRegistry],
    });
  }

  public increment() {
    super.increment();
    this.counter.inc();
  }
}
