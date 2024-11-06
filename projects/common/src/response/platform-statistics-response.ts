import { StatisticsType } from "../model/statistics/statistic-type";

export type PlatformStatisticsResponse = {
  /**
   * The statistics for this platform.
   */
  statistics: StatisticsType;
};
