import Metric from "../metric";
import { Point } from "@influxdata/influxdb-client";
import { BeatSaverMapModel } from "@ssr/common/model/beatsaver/map";

export default class BeatSaverMapsMetric extends Metric {
  constructor() {
    super("cached-beatsaver-maps");
  }

  async collect(): Promise<Point> {
    return this.getPointBase().intField("count", await BeatSaverMapModel.estimatedDocumentCount({}));
  }
}
