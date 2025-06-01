import { MetricType } from "../../service/metrics.service";
import NumberMetric from "../number-metric";

export default class TrackedScoresMetric extends NumberMetric {
  constructor() {
    super(MetricType.TRACKED_SCORES, 0, {
      fetchAfterRegister: true,
      interval: 1000, // 1 second
    });
  }
}
