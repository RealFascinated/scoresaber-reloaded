import { sql } from "drizzle-orm";
import { db } from "../db";
import { metricsTable, type MetricRow } from "../db/schema";

export class MetricsRepository {
  public static async loadAll(): Promise<MetricRow[]> {
    return db.select().from(metricsTable);
  }

  public static async upsertMany(rows: { id: string; value: unknown }[]): Promise<void> {
    if (rows.length === 0) {
      return;
    }
    await db
      .insert(metricsTable)
      .values(rows)
      .onConflictDoUpdate({
        target: metricsTable.id,
        set: {
          value: sql`excluded.value`,
          updatedAt: sql`now()`,
        },
      });
  }
}
