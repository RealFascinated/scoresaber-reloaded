import { getMidnightAlignedDate } from "@ssr/common/utils/time-utils";
import { count, gte } from "drizzle-orm";
import { Gauge } from "prom-client";
import { db } from "../../../db";
import { scoreSaberAccountsTable } from "../../../db/schema";
import { MetricType, prometheusRegistry } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class DailyNewAccountsMetric extends NumberMetric {
  constructor() {
    super(MetricType.DAILY_NEW_ACCOUNTS, 0);

    const gauge = new Gauge({
      name: "daily_new_accounts",
      help: "Number of new accounts created today",
      registers: [prometheusRegistry],
      collect: async () => {
        const [row] = await db
          .select({ c: count() })
          .from(scoreSaberAccountsTable)
          .where(gte(scoreSaberAccountsTable.joinedDate, getMidnightAlignedDate(new Date())));
        gauge.set(row?.c ?? 0);
      },
    });
  }
}
