import { MetricType } from "../../service/metrics.service";
import NumberMetric from "../number-metric";

export default class TrackedScoresMetric extends NumberMetric {
  constructor() {
    super(MetricType.TRACKED_SCORES, 0, {
      fetchAfterRegister: true,
    });
  }
}
