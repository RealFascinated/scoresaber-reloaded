import { Point } from "@influxdata/influxdb-client";
import { monitorEventLoopDelay } from "perf_hooks";
import { MetricType } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class EventLoopLagMetric extends NumberMetric {
  private histogram: ReturnType<typeof monitorEventLoopDelay>;

  constructor() {
    super(MetricType.EVENT_LOOP_LAG, 0, {
      fetchAfterRegister: false,
      interval: 1000,
    });

    this.histogram = monitorEventLoopDelay({ resolution: 20 });
    this.histogram.enable();
  }

  public async collect(): Promise<Point | undefined> {
    const point = this.getPointBase();

    // Convert from nanoseconds to milliseconds
    point.floatField("lag_ms", this.histogram.mean / 1000000);

    // Reset the histogram for the next measurement
    this.histogram.reset();

    return point;
  }
}
