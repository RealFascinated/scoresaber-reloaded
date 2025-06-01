import { Point } from "@influxdata/influxdb-client";
import { MinioBucket } from "@ssr/common/minio-buckets";
import { MetricType } from "../../service/metrics.service";
import MinioService from "../../service/minio.service";
import NumberMetric from "../number-metric";

export default class ReplayStatsMetric extends NumberMetric {
  constructor() {
    super(MetricType.REPLAY_STATS, 0, {
      fetchAfterRegister: false,
      interval: 1000 * 60 * 30, // 30 minutes
    });
  }

  public async collect(): Promise<Point | undefined> {
    const stats = await MinioService.getBucketStats(MinioBucket.BeatLeaderReplays);
    return this.getPointBase()
      .intField("total-size", stats.totalSize)
      .intField("replays", stats.totalObjects);
  }
}
