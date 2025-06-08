import { Point } from "@influxdata/influxdb-client";
import { QueueManager } from "../../../queue/queue-manager";
import { MetricType } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class QueueAverageTimeMetric extends NumberMetric {
  constructor() {
    super(MetricType.QUEUE_AVERAGE_PROCESSING_TIME, 0, {
      fetchAndStore: false,
      interval: 1000 * 30, // 30 seconds
    });
  }

  public async collect(): Promise<Point | undefined> {
    const point = this.getPointBase();

    for (const queue of QueueManager.getQueues()) {
      point.floatField(queue.name, queue.getAverageTimeInQueue());
    }

    return point;
  }
}
