import Metric from "../metric";
import { Point } from "@influxdata/influxdb-client";
import MinioService from "../../service/minio.service";
import { MinioBucket } from "@ssr/common/minio-buckets";

export default class BeatLeaderScoreStatsMetric extends Metric {
  constructor() {
    super("beatleader-score-stats");
  }

  async collect(): Promise<Point> {
    const { size, items } = await MinioService.getBucketSize(MinioBucket.BeatLeaderScoreStats);
    return this.getPointBase()
      .intField("count", items)
      .intField("size", size)
      .intField("average-score-stat-size", size / items);
  }
}
