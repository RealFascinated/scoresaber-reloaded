import { Point } from "@influxdata/influxdb-client";
import { QueueManager } from "../../../queue/queue-manager";
import { MetricType } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class QueueSizesMetric extends NumberMetric {
  constructor() {
    super(MetricType.QUEUE_SIZES, 0, {
      fetchAndStore: false,
      interval: 1000,
    });
  }

  public async collect(): Promise<Point | undefined> {
    const point = this.getPointBase();

    for (const queue of QueueManager.getQueues()) {
      point.floatField(queue.id, queue.getSize());
    }

    return point;
  }
}
