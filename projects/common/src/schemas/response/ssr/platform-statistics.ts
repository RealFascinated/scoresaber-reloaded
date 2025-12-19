import { StatisticsType } from "../../../model/statistics/statistic-type";

export type StatisticsResponse = {
  /**
   * The statistics for this platform.
   */
  statistics: StatisticsType;
};
