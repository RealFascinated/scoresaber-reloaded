import { Gauge } from "prom-client";
import { QueueManager } from "../../../queue/queue-manager";
import { MetricType, prometheusRegistry } from "../../../service/infra/metrics.service";
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
        const queueSizes = await Promise.all(
          QueueManager.getQueues().map(async queue => ({ queueId: queue.id, size: await queue.getSize() }))
        );
        let totalSize = 0;
        for (const { queueId, size } of queueSizes) {
          totalSize += size;
          this.value = totalSize;
          gauge.set({ queue: queueId }, size);
        }
      },
    });
  }
}
