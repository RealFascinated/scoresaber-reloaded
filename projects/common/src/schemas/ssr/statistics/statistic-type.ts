import { Type, type StaticDecode } from "@sinclair/typebox";
import { Statistic } from "./statistic";

export const StatisticsTypeSchema = Type.Object({
  daily: Type.Record(
    Type.String(),
    Type.Object({
      [Statistic.DailyUniquePlayers]: Type.Number(),
      [Statistic.ActiveAccounts]: Type.Number(),
    })
  ),
  hmdUsage: Type.Record(Type.String(), Type.Number()),
});

export type StatisticsType = StaticDecode<typeof StatisticsTypeSchema>;
