import { InfluxDB } from "@influxdata/influxdb-client";
import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { Statistic } from "@ssr/common/model/statistics/statistic";
import { formatDateMinimal } from "@ssr/common/utils/time-utils";
import { PlayerHmdService } from "./player/player-hmd.service";

interface InfluxRow {
  _time: string;
  _value: number;
  _field: string;
}

interface DailyStatistics {
  [Statistic.DailyUniquePlayers]: number;
  [Statistic.ActiveAccounts]: number;
}

interface StatisticsData {
  daily: {
    [date: string]: DailyStatistics;
  };
  hmdUsage: Record<string, number>;
}

const influxClient = new InfluxDB({
  url: env.INFLUXDB_URL,
  token: env.INFLUXDB_TOKEN,
});

const queryApi = influxClient.getQueryApi(env.INFLUXDB_ORG);

const createQuery = (measurement: string, aggregation: string, days: number) => {
  if (measurement === "active-players-hmd-statistic") {
    return `
      from(bucket: "${env.INFLUXDB_BUCKET}")
        |> range(start: -${days}d)
        |> filter(fn: (r) => r["_measurement"] == "${measurement}")
        |> last()
        |> yield(name: "latest")
    `;
  }

  return `
    from(bucket: "${env.INFLUXDB_BUCKET}")
      |> range(start: -${days}d)
      |> filter(fn: (r) => r["_measurement"] == "${measurement}")
      |> filter(fn: (r) => r["_field"] == "value")
      |> aggregateWindow(every: 1d, fn: ${aggregation}, createEmpty: false)
      |> fill(usePrevious: true)
      |> yield(name: "${aggregation}")
  `;
};

const QUERIES = {
  [Statistic.DailyUniquePlayers]: {
    measurement: "unique-daily-players",
    aggregation: "max",
  },
  [Statistic.ActiveAccounts]: {
    measurement: "active-accounts",
    aggregation: "mean",
  },
} as const;

export default class StatisticsService {
  public static async getScoreSaberStatistics(previousDays: number): Promise<StatisticsData> {
    try {
      const queryResults = await Promise.all(
        Object.entries(QUERIES).map(async ([statistic, { measurement, aggregation }]) => {
          const query = createQuery(measurement, aggregation, previousDays);
          const result = await queryApi.collectRows(query);
          return { statistic: statistic as Statistic, data: result as InfluxRow[] };
        })
      );

      const result: StatisticsData = {
        daily: {},
        hmdUsage: {},
      };

      // Initialize all dates with default values
      const allDates = new Set<string>();
      queryResults.forEach(({ data }) => {
        data.forEach(row => allDates.add(formatDateMinimal(new Date(row._time))));
      });

      allDates.forEach(date => {
        result.daily[date] = {
          [Statistic.DailyUniquePlayers]: 0,
          [Statistic.ActiveAccounts]: 0,
        };
      });

      // Process all results
      queryResults.forEach(({ statistic, data }) => {
        if (statistic === Statistic.ActivePlayerHmdUsage) {
          try {
            // Each row represents a single HMD type with its count
            result.hmdUsage = data.reduce(
              (acc, row) => {
                acc[row._field] = row._value;
                return acc;
              },
              {} as Record<string, number>
            );
          } catch (error) {
            Logger.error("Failed to process HMD usage data:", error);
            result.hmdUsage = {};
          }
        } else {
          data.forEach(row => {
            const date = formatDateMinimal(new Date(row._time));
            result.daily[date][statistic] = Math.round(row._value) || 0;
          });
        }
      });

      // Get hmd usage
      result.hmdUsage = await PlayerHmdService.getActiveHmdUsage();

      return result;
    } catch (error) {
      Logger.error("Failed to get ScoreSaber statistics from InfluxDB:", error);
      throw error;
    }
  }
}
