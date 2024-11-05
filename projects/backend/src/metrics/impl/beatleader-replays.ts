import Metric from "../metric";
import { Point } from "@influxdata/influxdb-client";
import MinioService from "../../service/minio.service";
import { MinioBucket } from "@ssr/common/minio-buckets";

export default class BeatLeaderReplaysMetric extends Metric {
  constructor() {
    super("beatleader-replays");
  }

  async collect(): Promise<Point> {
    const { size, items } = await MinioService.getBucketSize(MinioBucket.BeatLeaderReplays);
    return this.getPointBase()
      .intField("count", items)
      .intField("size", size)
      .intField("average-replay-size", size / items);
  }
}
