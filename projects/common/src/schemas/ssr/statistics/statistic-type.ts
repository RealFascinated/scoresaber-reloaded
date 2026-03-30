import { Statistic } from "./statistic";

interface DailyStatistics {
  [Statistic.DailyUniquePlayers]: number;
  [Statistic.ActiveAccounts]: number;
}

export type StatisticsType = {
  daily: {
    [date: string]: DailyStatistics;
  };
  hmdUsage: Record<string, number>;
};
