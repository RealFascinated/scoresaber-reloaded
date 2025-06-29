import { TimeUnit } from "@ssr/common/utils/time-utils";
import { MetricType } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class TrackedScoresMetric extends NumberMetric {
  constructor() {
    super(MetricType.TRACKED_SCORES, 0, {
      fetchAndStore: true,
      interval: TimeUnit.toMillis(TimeUnit.Second, 1),
    });
  }
}
