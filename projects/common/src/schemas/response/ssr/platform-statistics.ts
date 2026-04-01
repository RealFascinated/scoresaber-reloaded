import { StatisticsType } from "../../ssr/statistics/statistic-type";

export type StatisticsResponse = {
  /**
   * The statistics for this platform.
   */
  statistics: StatisticsType;
};
