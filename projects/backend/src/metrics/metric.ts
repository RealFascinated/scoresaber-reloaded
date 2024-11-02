import { Point } from "@influxdata/influxdb-client";

export default abstract class Metric {
  /**
   * The id of the metric.
   */
  public id: string;

  protected constructor(id: string) {
    this.id = id;
  }

  /**
   * Collects the metric.
   */
  public abstract collect(): Promise<Point>;

  /**
   * Gets the base point.
   * @private
   */
  protected getPointBase(): Point {
    return new Point(this.id);
  }
}
