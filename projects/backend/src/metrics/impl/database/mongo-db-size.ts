import Logger from "@ssr/common/logger";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { mongoose } from "@typegoose/typegoose";
import { Gauge } from "prom-client";
import { MetricType, prometheusRegistry } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class MongoDbSizeMetric extends NumberMetric {
  private totalSizeGauge: Gauge;
  private indexSizeGauge: Gauge;
  private collectionsSizeGauge: Gauge;

  constructor() {
    super(MetricType.MONGO_DB_SIZE, 0, {
      interval: TimeUnit.toMillis(TimeUnit.Minute, 1),
    });

    this.totalSizeGauge = new Gauge({
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
          this.totalSizeGauge.set({ type: "total" }, totalSize);
        } catch (error) {
          Logger.error("Failed to collect MongoDB size metric:", error);
        }
      },
    });

    this.indexSizeGauge = new Gauge({
      name: "mongo_db_index_size_bytes",
      help: "MongoDB index size in bytes",
      registers: [prometheusRegistry],
      collect: async () => {
        try {
          if (!mongoose.connection.db) {
            return;
          }

          const stats = await mongoose.connection.db.command({ dbStats: 1 });
          this.indexSizeGauge.set(stats.indexSize);
        } catch (error) {
          Logger.error("Failed to collect MongoDB index size metric:", error);
        }
      },
    });

    this.collectionsSizeGauge = new Gauge({
      name: "mongo_db_collections_size_bytes",
      help: "MongoDB collections size in bytes",
      registers: [prometheusRegistry],
      collect: async () => {
        try {
          if (!mongoose.connection.db) {
            return;
          }

          const stats = await mongoose.connection.db.command({ dbStats: 1 });
          this.collectionsSizeGauge.set(stats.storageSize);
        } catch (error) {
          Logger.error("Failed to collect MongoDB collections size metric:", error);
        }
      },
    });
  }
}
