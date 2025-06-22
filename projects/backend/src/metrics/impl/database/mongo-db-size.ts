import { Point } from "@influxdata/influxdb-client";
import Logger from "@ssr/common/logger";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { mongoose } from "@typegoose/typegoose";
import { MetricType } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class MongoDbSizeMetric extends NumberMetric {
  constructor() {
    super(MetricType.MONGO_DB_SIZE, 0, {
      fetchAndStore: false,
      interval: TimeUnit.toMillis(TimeUnit.Minute, 1),
    });
  }

  public async collect(): Promise<Point | undefined> {
    try {
      if (!mongoose.connection.db) {
        Logger.error("MongoDB connection not established");
        return undefined;
      }

      const stats = await mongoose.connection.db.command({ dbStats: 1 });

      return new Point(MetricType.MONGO_DB_SIZE)
        .floatField("total", stats.dataSize + stats.indexSize) // Total size in bytes
        .floatField("index", stats.indexSize) // Index size in bytes
        .floatField("collections", stats.dataSize) // Total data size in bytes
        .timestamp(new Date());
    } catch (error) {
      Logger.error("Failed to collect MongoDB size metric:", error);
      return undefined;
    }
  }
}
