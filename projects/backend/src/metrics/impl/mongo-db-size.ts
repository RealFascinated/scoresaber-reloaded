import { Point } from "@influxdata/influxdb-client";
import mongoose from "mongoose";
import { MetricType } from "../../service/metrics.service";
import NumberMetric from "../number-metric";

export default class MongoDbSizeMetric extends NumberMetric {
  constructor() {
    super(MetricType.MONGO_DB_SIZE, 0, {
      fetchAfterRegister: false,
      interval: 1000 * 60 * 5, // 5 minutes
    });
  }

  public async collect(): Promise<Point | undefined> {
    try {
      if (!mongoose.connection.db) {
        console.error("MongoDB connection not established");
        return undefined;
      }

      const stats = await mongoose.connection.db.command({ dbStats: 1 });

      return new Point(MetricType.MONGO_DB_SIZE)
        .floatField("total", stats.dataSize + stats.indexSize) // Total size in bytes
        .floatField("index", stats.indexSize) // Index size in bytes
        .floatField("collections", stats.dataSize) // Total data size in bytes
        .timestamp(new Date());
    } catch (error) {
      console.error("Failed to collect MongoDB size metric:", error);
      return undefined;
    }
  }
}
