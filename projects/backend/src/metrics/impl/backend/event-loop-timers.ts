import { Point } from "@influxdata/influxdb-client";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { MetricType } from "../../../service/metrics.service";
import Metric from "../../metric";

interface TimerCleanupValue {
  activeTimers: number;
  activeIntervals: number;
  totalTimers: number;
  totalIntervals: number;
}

export default class EventLoopTimersMetric extends Metric<TimerCleanupValue> {
  private activeTimers: Set<NodeJS.Timeout> = new Set();
  private activeIntervals: Set<NodeJS.Timeout> = new Set();

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
        interval: TimeUnit.toMillis(TimeUnit.Second, 5),
        fetchAndStore: false,
      }
    );

    // Override setTimeout
    const originalSetTimeout = global.setTimeout;
    global.setTimeout = ((
      callback: (...args: unknown[]) => void,
      ms: number,
      ...args: unknown[]
    ) => {
      const timer = originalSetTimeout(() => {
        this.activeTimers.delete(timer);
        callback(...args);
      }, ms);
      this.activeTimers.add(timer);
      return timer;
    }) as typeof setTimeout;

    // Override setInterval
    const originalSetInterval = global.setInterval;
    global.setInterval = ((
      callback: (...args: unknown[]) => void,
      ms: number,
      ...args: unknown[]
    ) => {
      const timer = originalSetInterval(() => {
        callback(...args);
      }, ms);
      this.activeIntervals.add(timer);
      return timer;
    }) as typeof setInterval;

    // Override clearTimeout
    const originalClearTimeout = global.clearTimeout;
    global.clearTimeout = ((id: NodeJS.Timeout) => {
      this.activeTimers.delete(id);
      originalClearTimeout(id);
    }) as typeof clearTimeout;

    // Override clearInterval
    const originalClearInterval = global.clearInterval;
    global.clearInterval = ((id: NodeJS.Timeout) => {
      this.activeIntervals.delete(id);
      originalClearInterval(id);
    }) as typeof clearInterval;
  }

  async collect(): Promise<Point> {
    // Get counts from our tracking sets
    const activeTimers = this.activeTimers.size;
    const activeIntervals = this.activeIntervals.size;

    // Update the metric value
    this.value = {
      activeTimers,
      activeIntervals,
      totalTimers: activeTimers + activeIntervals,
      totalIntervals: activeIntervals,
    };

    return this.getPointBase()
      .floatField("active_timers", activeTimers)
      .floatField("active_intervals", activeIntervals)
      .floatField("total_timers", activeTimers + activeIntervals)
      .floatField("total_intervals", activeIntervals);
  }
}
