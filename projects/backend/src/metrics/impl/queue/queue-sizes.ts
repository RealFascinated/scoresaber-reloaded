import { Gauge } from "prom-client";
import { QueueManager } from "../../../queue/queue-manager";
import { MetricType, prometheusRegistry } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class QueueSizesMetric extends NumberMetric {
  constructor() {
    super(MetricType.QUEUE_SIZES, 0);

    const gauge = new Gauge({
      name: "queue_size",
      help: "Size of queues",
      labelNames: ["queue"],
      registers: [prometheusRegistry],
      collect: async () => {
        for (const queue of QueueManager.getQueues()) {
          const size = await queue.getSize();
          gauge.set({ queue: queue.id }, size);
        }
      },
    });
  }
}
