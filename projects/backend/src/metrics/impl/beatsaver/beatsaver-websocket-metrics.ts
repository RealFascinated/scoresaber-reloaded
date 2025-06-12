import { Point } from "@influxdata/influxdb-client";
import { MetricType } from "../../../service/metrics.service";
import Metric from "../../metric";

export default class BeatSaverWebsocketMetric extends Metric<{
  mapUpdates: number;
}> {
  constructor() {
    super(
      MetricType.BEATSAVER_WEBSOCKET_MAP_METRICS,
      {
        mapUpdates: 0,
      },
      {
        fetchAndStore: true,
        interval: 1000 * 60, // 1 minute
      }
    );
  }

  public async collect(): Promise<Point | undefined> {
    return this.getPointBase().floatField("mapUpdates", this.value.mapUpdates);
  }

  public incrementMapUpdates(): void {
    this.value.mapUpdates++;
  }
}
