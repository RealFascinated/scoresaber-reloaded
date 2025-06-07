import { Point } from "@influxdata/influxdb-client";
import { MetricType } from "../../../service/metrics.service";
import Metric from "../../metric";

interface TimerCleanupValue {
  activeTimers: number;
  activeIntervals: number;
  totalTimers: number;
  totalIntervals: number;
}

export default class EventLoopTimersMetric extends Metric<TimerCleanupValue> {
  constructor() {
    super(
      MetricType.EVENT_LOOP_TIMERS,
      {
        activeTimers: 0,
        activeIntervals: 0,
        totalTimers: 0,
        totalIntervals: 0,
      },
      {
        interval: 60000, // Collect every minute
        fetchAfterRegister: false,
      }
    );
  }

  async collect(): Promise<Point> {
    // Get all active timers and intervals
    const activeTimers = this.getActiveTimers();
    const activeIntervals = this.getActiveIntervals();

    // Update the metric value
    this.value = {
      activeTimers,
      activeIntervals,
      totalTimers: activeTimers + activeIntervals,
      totalIntervals: activeIntervals,
    };

    // Create a point for InfluxDB
    return new Point("event_loop_timers")
      .floatField("active_timers", activeTimers)
      .floatField("active_intervals", activeIntervals)
      .floatField("total_timers", activeTimers + activeIntervals)
      .floatField("total_intervals", activeIntervals);
  }

  private getActiveTimers(): number {
    // Get all active timers from the process
    const resources = process.getActiveResourcesInfo();
    return resources.filter(resource => resource === "Timeout").length;
  }

  private getActiveIntervals(): number {
    // Get all active intervals from the process
    const resources = process.getActiveResourcesInfo();
    return resources.filter(resource => resource === "Interval").length;
  }
}
