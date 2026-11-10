import { Type, type StaticDecode } from "typebox";
import { StatisticsTypeSchema } from "../../ssr/statistics/statistic-type";

export const StatisticsResponseSchema = Type.Object({
  statistics: StatisticsTypeSchema,
});

export type StatisticsResponse = StaticDecode<typeof StatisticsResponseSchema>;
