import Logger from "@ssr/common/logger";
import { Statistic } from "@ssr/common/model/statistics/statistic";
import { formatDateMinimal } from "@ssr/common/utils/time-utils";
import { influxClient } from "./metrics.service";
import { PlayerHmdService } from "./player/player-hmd.service";

interface InfluxRow {
  time: string;
  value: number;
  field?: string;
}

interface DailyStatistics {
  [Statistic.DailyUniquePlayers]: number;
  [Statistic.ActiveAccounts]: number;
}

export interface StatisticsData {
  daily: {
    [date: string]: DailyStatistics;
  };
  hmdUsage: Record<string, number>;
}

/**
 * Run a FlightSQL query and collect rows
 */
const runQuery = async <T>(query: string): Promise<T[]> => {
  const rows: T[] = [];
  for await (const row of influxClient.queryPoints(query)) {
    rows.push(row as T);
  }
  return rows;
};

/**
 * Build SQL queries
 */
const createSqlQuery = (
  measurement: string,
  aggregation: "max" | "mean",
  days: number
): string => {
  if (measurement === "active_players_hmd_statistic") {
    return `
      SELECT *
      FROM ${measurement}
      ORDER BY time DESC
      LIMIT 1
    `;
  }

  const aggFn = aggregation === "max" ? "MAX" : "AVG";

  return `
    SELECT
      DATE_TRUNC('day', time) AS time,
      ${aggFn}(value) AS value
    FROM ${measurement}
    WHERE time >= NOW() - INTERVAL '${days} days'
    GROUP BY time
    ORDER BY time
  `;
};

const QUERIES = {
  [Statistic.DailyUniquePlayers]: {
    measurement: "unique_daily_players",
    aggregation: "max",
  },
  [Statistic.ActiveAccounts]: {
    measurement: "active_accounts",
    aggregation: "mean",
  },
} as const;

export default class StatisticsService {
  public static async getScoreSaberStatistics(
    previousDays: number
  ): Promise<StatisticsData> {
    try {
      const queryResults = await Promise.all(
        Object.entries(QUERIES).map(async ([statistic, cfg]) => {
          const query = createSqlQuery(
            cfg.measurement,
            cfg.aggregation,
            previousDays
          );

          const data = await runQuery<InfluxRow>(query);

          return {
            statistic: statistic as Statistic,
            data,
          };
        })
      );

      const result: StatisticsData = {
        daily: {},
        hmdUsage: {},
      };

      // Collect all dates
      const allDates = new Set<string>();
      queryResults.forEach(({ data }) => {
        data.forEach(row =>
          allDates.add(formatDateMinimal(new Date(row.time)))
        );
      });

      // Initialize dates
      allDates.forEach(date => {
        result.daily[date] = {
          [Statistic.DailyUniquePlayers]: 0,
          [Statistic.ActiveAccounts]: 0,
        };
      });

      // Fill values
      queryResults.forEach(({ statistic, data }) => {
        data.forEach(row => {
          const date = formatDateMinimal(new Date(row.time));
          result.daily[date][statistic as keyof DailyStatistics] = Math.round(row.value) || 0;
        });
      });

      // HMD usage comes from separate service
      result.hmdUsage = await PlayerHmdService.getActiveHmdUsage();

      return result;
    } catch (error) {
      Logger.error(
        "Failed to get ScoreSaber statistics from InfluxDB (SQL):",
        error
      );
      throw error;
    }
  }
}
