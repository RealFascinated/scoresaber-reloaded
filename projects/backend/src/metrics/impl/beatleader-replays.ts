import Metric from "../metric";
import { Point } from "@influxdata/influxdb-client";
import MinioService from "../../service/minio.service";
import { MinioBucket } from "@ssr/common/minio-buckets";
import { AdditionalScoreDataModel } from "@ssr/common/model/additional-score-data/additional-score-data";

export default class BeatLeaderReplaysMetric extends Metric {
  constructor() {
    super("beatleader-replays");
  }

  async collect(): Promise<Point> {
    const count = await AdditionalScoreDataModel.countDocuments({ cachedReplayId: { $exists: true } });
    const size = await MinioService.getBucketSize(MinioBucket.BeatLeaderReplays);
    return this.getPointBase()
      .intField("count", count)
      .intField("size", size)
      .intField("average-replay-size", size / count);
  }
}
