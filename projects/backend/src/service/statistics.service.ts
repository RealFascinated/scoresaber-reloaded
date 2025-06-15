import { InfluxDB } from "@influxdata/influxdb-client";
import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { Statistic } from "@ssr/common/model/statistics/statistic";
import { formatDateMinimal } from "@ssr/common/utils/time-utils";

interface InfluxRow {
  _time: string;
  _value: number;
}

interface StatisticsData {
  [date: string]: Record<Statistic, number>;
}

const influxClient = new InfluxDB({
  url: env.INFLUXDB_URL,
  token: env.INFLUXDB_TOKEN,
});

const queryApi = influxClient.getQueryApi(env.INFLUXDB_ORG);

const createQuery = (measurement: string, aggregation: string, days: number) => `
  from(bucket: "${env.INFLUXDB_BUCKET}")
    |> range(start: -${days}d)
    |> filter(fn: (r) => r["_measurement"] == "${measurement}")
    |> filter(fn: (r) => r["_field"] == "value")
    |> aggregateWindow(every: 1d, fn: ${aggregation}, createEmpty: false)
    |> fill(usePrevious: true)
    |> yield(name: "${aggregation}")
`;

const QUERIES = {
  [Statistic.ActivePlayers]: {
    measurement: "unique-daily-players",
    aggregation: "max",
  },
  [Statistic.PlayerCount]: {
    measurement: "active-accounts",
    aggregation: "mean",
  },
  [Statistic.TotalScores]: {
    measurement: "tracked-scores",
    aggregation: "count",
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

      const result: StatisticsData = {};

      // Initialize all dates with default values
      const allDates = new Set<string>();
      queryResults.forEach(({ data }) => {
        data.forEach(row => allDates.add(formatDateMinimal(new Date(row._time))));
      });

      allDates.forEach(date => {
        result[date] = {
          [Statistic.ActivePlayers]: 0,
          [Statistic.PlayerCount]: 0,
          [Statistic.TotalScores]: 0,
        };
      });

      // Process all results
      queryResults.forEach(({ statistic, data }) => {
        data.forEach(row => {
          const date = formatDateMinimal(new Date(row._time));
          result[date][statistic] = Math.round(row._value) || 0;
        });
      });

      return result;
    } catch (error) {
      Logger.error("Failed to get ScoreSaber statistics from InfluxDB:", error);
      throw error;
    }
  }
}
