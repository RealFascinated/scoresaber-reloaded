import Metric from "../metric";
import { Point } from "@influxdata/influxdb-client";
import { AdditionalScoreDataModel } from "@ssr/common/model/additional-score-data/additional-score-data";
import MinioService from "../../service/minio.service";
import { MinioBucket } from "@ssr/common/minio-buckets";

export default class BeatLeaderScoreStatsMetric extends Metric {
  constructor() {
    super("beatleader-score-stats");
  }

  async collect(): Promise<Point> {
    const count = await AdditionalScoreDataModel.countDocuments({ cachedScoreStats: true });
    const size = await MinioService.getBucketSize(MinioBucket.BeatLeaderScoreStats);
    return this.getPointBase()
      .intField("count", count)
      .intField("size", size)
      .intField("average-score-stat-size", size / count);
  }
}
