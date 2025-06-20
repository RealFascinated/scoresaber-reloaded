import { Point } from "@influxdata/influxdb-client";
import { MetricType } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class PointsPerSecondMetric extends NumberMetric {
  private pointCount = 0;
  private lastResetTime = Date.now();

  constructor() {
    super(MetricType.POINTS_PER_SECOND, 0, {
      fetchAndStore: false,
      interval: 1000, // Collect every second
    });
  }

  /**
   * Increments the point count for tracking points per second
   */
  public incrementPointCount() {
    this.pointCount++;
  }

  public async collect(): Promise<Point | undefined> {
    const now = Date.now();
    const timeDiff = (now - this.lastResetTime) / 1000; // Convert to seconds

    // Calculate points per second
    const pointsPerSecond = timeDiff > 0 ? this.pointCount / timeDiff : 0;

    // Reset counters
    this.pointCount = 0;
    this.lastResetTime = now;

    // Update the metric value
    this.value = pointsPerSecond;

    return this.getPointBase().floatField("points_per_second", pointsPerSecond);
  }
}
