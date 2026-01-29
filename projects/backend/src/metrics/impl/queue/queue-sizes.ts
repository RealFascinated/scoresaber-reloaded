import { Gauge } from "prom-client";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { QueueManager } from "../../../queue/queue-manager";
import { MetricType } from "../../../service/metrics.service";
import { prometheusRegistry } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class QueueSizesMetric extends NumberMetric {
  private gauge: Gauge<string>;

  constructor() {
    super(MetricType.QUEUE_SIZES, 0, {
      interval: TimeUnit.toMillis(TimeUnit.Second, 1),
    });

    this.gauge = new Gauge({
      name: "queue_size",
      help: "Size of queues",
      labelNames: ["queue"],
      registers: [prometheusRegistry],
      collect: async () => {
        for (const queue of QueueManager.getQueues()) {
          const size = await queue.getSize();
          this.gauge.set({ queue: queue.id }, size);
        }
      },
    });
  }
}
