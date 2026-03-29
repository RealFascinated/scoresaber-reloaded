import { count, eq } from "drizzle-orm";
import { Gauge } from "prom-client";
import { db } from "../../../db";
import { scoreSaberAccountsTable } from "../../../db/schema";
import { MetricType, prometheusRegistry } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class TrackedPlayersMetric extends NumberMetric {
  constructor() {
    super(MetricType.TRACKED_PLAYERS, 0);

    const totalGauge = new Gauge({
      name: "tracked_players_total",
      help: "Total number of tracked players",
      registers: [prometheusRegistry],
      collect: async () => {
        const [row] = await db.select({ c: count() }).from(scoreSaberAccountsTable);
        totalGauge.set(row?.c ?? 0);
      },
    });

    const inactiveGauge = new Gauge({
      name: "tracked_players_inactive",
      help: "Number of inactive tracked players",
      registers: [prometheusRegistry],
      collect: async () => {
        const [inactiveRow] = await db
          .select({ c: count() })
          .from(scoreSaberAccountsTable)
          .where(eq(scoreSaberAccountsTable.inactive, true));
        inactiveGauge.set(inactiveRow?.c ?? 0);
      },
    });
  }
}
