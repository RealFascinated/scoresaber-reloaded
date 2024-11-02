import Metric from "../metric";
import { Point } from "@influxdata/influxdb-client";
import MinioService from "../../service/minio.service";
import { MinioBucket } from "@ssr/common/minio-buckets";

export default class BeatLeaderReplaysMetric extends Metric {
  constructor() {
    super("beatleader-replays");
  }

  async collect(): Promise<Point> {
    return this.getPointBase().intField("size", await MinioService.getBucketSize(MinioBucket.BeatLeaderReplays));
  }
}
