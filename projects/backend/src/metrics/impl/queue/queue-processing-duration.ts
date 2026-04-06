import { Counter, Histogram } from "prom-client";
import { Queue, QueueProcessEvent } from "../../../queue/queue";
import { MetricType, prometheusRegistry } from "../../../service/infra/metrics.service";
import Metric from "../../metric";

export default class QueueProcessingDurationMetric extends Metric<null> {
  private readonly durationHistogram: Histogram<"queue">;
  private readonly failedCounter: Counter<"queue">;

  constructor() {
    super(MetricType.QUEUE_PROCESSING_DURATION, null, { persist: false });

    this.durationHistogram = new Histogram({
      name: "queue_processing_duration_ms",
      help: "Queue item processing duration in milliseconds",
      labelNames: ["queue"],
      registers: [prometheusRegistry],
    });

    this.failedCounter = new Counter({
      name: "queue_processing_failures_total",
      help: "Total failed queue item processing attempts",
      labelNames: ["queue"],
      registers: [prometheusRegistry],
    });

    Queue.setProcessObserver(this.onQueueProcessed.bind(this));
  }

  public cleanup(): void {
    Queue.setProcessObserver(undefined);
  }

  private onQueueProcessed(event: QueueProcessEvent): void {
    this.durationHistogram.observe({ queue: event.queueId }, event.durationMs);
    if (!event.success) {
      this.failedCounter.inc({ queue: event.queueId });
    }
  }
}
