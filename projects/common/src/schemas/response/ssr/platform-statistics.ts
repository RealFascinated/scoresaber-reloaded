import { Type, type StaticDecode } from "@sinclair/typebox";
import { StatisticsTypeSchema } from "../../ssr/statistics/statistic-type";

export const StatisticsResponseSchema = Type.Object({
  /**
   * The statistics for this platform.
   */
  statistics: StatisticsTypeSchema,
});

export type StatisticsResponse = StaticDecode<typeof StatisticsResponseSchema>;
