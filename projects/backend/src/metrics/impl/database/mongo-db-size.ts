import Logger from "@ssr/common/logger";
import { mongoose } from "@typegoose/typegoose";
import { Gauge } from "prom-client";
import { MetricType, prometheusRegistry } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class MongoDbSizeMetric extends NumberMetric {
  private readonly totalSizeGauge: Gauge<"type">;
  private readonly indexSizeGauge: Gauge;
  private readonly collectionsSizeGauge: Gauge;
  private inFlightCollection: Promise<void> | undefined;
  private lastCollectedAt = 0;

  constructor() {
    super(MetricType.MONGO_DB_SIZE, 0);

    this.totalSizeGauge = new Gauge({
      name: "mongo_db_size_bytes",
      help: "MongoDB database size in bytes",
      labelNames: ["type"],
      registers: [prometheusRegistry],
      collect: async () => {
        await this.collectDbStats();
      },
    });

    this.indexSizeGauge = new Gauge({
      name: "mongo_db_index_size_bytes",
      help: "MongoDB index size in bytes",
      registers: [prometheusRegistry],
      collect: async () => {
        await this.collectDbStats();
      },
    });

    this.collectionsSizeGauge = new Gauge({
      name: "mongo_db_collections_size_bytes",
      help: "MongoDB collections size in bytes",
      registers: [prometheusRegistry],
      collect: async () => {
        await this.collectDbStats();
      },
    });
  }

  private async collectDbStats(): Promise<void> {
    if (this.inFlightCollection) {
      return this.inFlightCollection;
    }

    this.inFlightCollection = (async () => {
      try {
        if (!mongoose.connection.db) {
          Logger.error("MongoDB connection not established");
          return;
        }

        const now = Date.now();
        if (now - this.lastCollectedAt < 5_000) {
          return;
        }

        this.lastCollectedAt = now;
        const stats = await mongoose.connection.db.command({ dbStats: 1 });
        const totalSize = stats.storageSize + stats.indexSize;
        this.value = totalSize;
        this.totalSizeGauge.set({ type: "total" }, totalSize);
        this.indexSizeGauge.set(stats.indexSize);
        this.collectionsSizeGauge.set(stats.storageSize);
      } catch (error) {
        Logger.error("Failed to collect MongoDB size metric:", error);
      } finally {
        this.inFlightCollection = undefined;
      }
    })();

    return this.inFlightCollection;
  }
}
