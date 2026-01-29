import Logger from "@ssr/common/logger";
import { mongoose } from "@typegoose/typegoose";
import { Gauge } from "prom-client";
import { MetricType, prometheusRegistry } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class MongoDbSizeMetric extends NumberMetric {
  constructor() {
    super(MetricType.MONGO_DB_SIZE, 0);

    const totalSizeGauge = new Gauge({
      name: "mongo_db_size_bytes",
      help: "MongoDB database size in bytes",
      labelNames: ["type"],
      registers: [prometheusRegistry],
      collect: async () => {
        try {
          if (!mongoose.connection.db) {
            Logger.error("MongoDB connection not established");
            return;
          }

          const stats = await mongoose.connection.db.command({ dbStats: 1 });
          const totalSize = stats.storageSize + stats.indexSize;
          totalSizeGauge.set({ type: "total" }, totalSize);
        } catch (error) {
          Logger.error("Failed to collect MongoDB size metric:", error);
        }
      },
    });

    const indexSizeGauge = new Gauge({
      name: "mongo_db_index_size_bytes",
      help: "MongoDB index size in bytes",
      registers: [prometheusRegistry],
      collect: async () => {
        try {
          if (!mongoose.connection.db) {
            return;
          }

          const stats = await mongoose.connection.db.command({ dbStats: 1 });
          indexSizeGauge.set(stats.indexSize);
        } catch (error) {
          Logger.error("Failed to collect MongoDB index size metric:", error);
        }
      },
    });

    const collectionsSizeGauge = new Gauge({
      name: "mongo_db_collections_size_bytes",
      help: "MongoDB collections size in bytes",
      registers: [prometheusRegistry],
      collect: async () => {
        try {
          if (!mongoose.connection.db) {
            return;
          }

          const stats = await mongoose.connection.db.command({ dbStats: 1 });
          collectionsSizeGauge.set(stats.storageSize);
        } catch (error) {
          Logger.error("Failed to collect MongoDB collections size metric:", error);
        }
      },
    });
  }
}
