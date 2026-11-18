import { Histogram } from "@prometheus-io/client";
import Metric from "../../metric";
import { MetricType, prometheusRegistry } from "../../prometheus";

export type ScoreSaberApiOutcome = "ok" | "http_4xx" | "http_429" | "http_5xx" | "timeout" | "network";

export const SCORESABER_API_CALL_METRIC_NAME = "scoresaber_api_request_duration_ms";

export default class ScoreSaberApiCallMetric extends Metric<number> {
  private readonly histogram: Histogram<"endpoint" | "outcome">;

  constructor() {
    super(MetricType.SCORESABER_API_CALLS, 0, { persist: false });

    this.histogram = new Histogram<"endpoint" | "outcome">({
      name: SCORESABER_API_CALL_METRIC_NAME,
      help: "Duration of outbound ScoreSaber API calls (per attempt) in milliseconds",
      labelNames: ["endpoint", "outcome"],
      buckets: [25, 50, 100, 200, 400, 800, 1600, 3200, 6400, 15000],
      registers: [prometheusRegistry],
    });
  }

  public observe(endpoint: string, outcome: ScoreSaberApiOutcome, durationMs: number) {
    this.value = durationMs;
    this.histogram.observe({ endpoint, outcome }, durationMs);
  }
}
