import { Point } from "@influxdata/influxdb-client";
import { MetricType } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class ActiveTimeoutsMetric extends NumberMetric {
  private activeTimeouts: number = 0;
  private originalSetTimeout: typeof setTimeout;

  constructor() {
    super(MetricType.ACTIVE_TIMEOUTS, 0, {
      fetchAfterRegister: false,
      interval: 1000, // Check every second
    });

    // Store original setTimeout
    this.originalSetTimeout = global.setTimeout;

    // Override setTimeout to track timeouts
    global.setTimeout = ((
      callback: (...args: unknown[]) => void,
      delay?: number,
      ...args: unknown[]
    ) => {
      this.activeTimeouts++;
      const timeoutId = this.originalSetTimeout(() => {
        this.activeTimeouts--;
        callback(...args);
      }, delay);
      return timeoutId;
    }) as unknown as typeof setTimeout;
  }

  public async collect(): Promise<Point | undefined> {
    const point = this.getPointBase();
    point.floatField("active_timeouts", this.activeTimeouts);
    return point;
  }
}
