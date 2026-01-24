import { Point } from "@influxdata/influxdb3-client";
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

      return Point.measurement(MetricType.MONGO_DB_SIZE)
        .setFloatField("total", stats.storageSize + stats.indexSize) // Compressed total size in bytes
        .setFloatField("index", stats.indexSize) // Compressed index size in bytes
        .setFloatField("collections", stats.storageSize) // Compressed data size in bytes
        .setTimestamp(new Date());
    } catch (error) {
      Logger.error("Failed to collect MongoDB size metric:", error);
      return undefined;
    }
  }
}
