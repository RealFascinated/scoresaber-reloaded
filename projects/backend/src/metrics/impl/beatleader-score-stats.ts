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
    return this.getPointBase()
      .intField("count", await AdditionalScoreDataModel.countDocuments({ cachedScoreStats: true }))
      .intField("size", await MinioService.getBucketSize(MinioBucket.BeatLeaderScoreStats));
  }
}
