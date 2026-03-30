import Logger from "@ssr/common/logger";
import { sql } from "drizzle-orm";
import { Gauge } from "prom-client";
import { db } from "../../../db";
import { MetricType, prometheusRegistry } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

type TableSizeRow = {
  tableName: string;
  totalSizeBytes: number | string;
  dataSizeBytes: number | string;
  indexSizeBytes: number | string;
};

function toSafeNumber(value: number | string): number {
  return typeof value === "number" ? value : Number(value);
}

export default class PostgresDbSizeMetric extends NumberMetric {
  private readonly totalSizeGauge: Gauge;
  private readonly tableSizeGauge: Gauge<"table" | "type">;
  private inFlightCollection: Promise<void> | undefined;
  private lastCollectedAt = 0;

  constructor() {
    super(MetricType.POSTGRES_DB_SIZE, 0);

    this.totalSizeGauge = new Gauge({
      name: "postgres_db_size_bytes",
      help: "Total PostgreSQL public schema table size in bytes",
      registers: [prometheusRegistry],
      collect: async () => {
        await this.collectDbStats();
      },
    });

    this.tableSizeGauge = new Gauge({
      name: "postgres_table_size_bytes",
      help: "PostgreSQL table size in bytes by table and type",
      labelNames: ["table", "type"],
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
        const now = Date.now();
        if (now - this.lastCollectedAt < 5_000) {
          return;
        }

        this.lastCollectedAt = now;
        const result = await db.execute<TableSizeRow>(sql`
          SELECT
            tablename AS "tableName",
            pg_total_relation_size(quote_ident(tablename)) AS "totalSizeBytes",
            pg_relation_size(quote_ident(tablename)) AS "dataSizeBytes",
            pg_indexes_size(quote_ident(tablename)) AS "indexSizeBytes"
          FROM pg_tables
          WHERE schemaname = 'public'
          ORDER BY pg_total_relation_size(quote_ident(tablename)) DESC
        `);

        let totalDatabaseSize = 0;
        this.tableSizeGauge.reset();

        for (const row of result.rows) {
          const totalSizeBytes = toSafeNumber(row.totalSizeBytes);
          const dataSizeBytes = toSafeNumber(row.dataSizeBytes);
          const indexSizeBytes = toSafeNumber(row.indexSizeBytes);

          totalDatabaseSize += totalSizeBytes;
          this.tableSizeGauge.set({ table: row.tableName, type: "total" }, totalSizeBytes);
          this.tableSizeGauge.set({ table: row.tableName, type: "data" }, dataSizeBytes);
          this.tableSizeGauge.set({ table: row.tableName, type: "index" }, indexSizeBytes);
        }

        this.value = totalDatabaseSize;
        this.totalSizeGauge.set(totalDatabaseSize);
      } catch (error) {
        Logger.error("Failed to collect PostgreSQL database size metric:", error);
      } finally {
        this.inFlightCollection = undefined;
      }
    })();

    return this.inFlightCollection;
  }
}
