import { Type, type StaticDecode } from "@sinclair/typebox";

const AppStatisticSchema = Type.Object({
  value: Type.Number(),
  velocity: Type.Number(),
});

const AppStatisticsResponseSchema = Type.Object({
  leaderboardCount: AppStatisticSchema,
  trackedScores: AppStatisticSchema,
  scoreHistoryScores: AppStatisticSchema,
  storedReplays: AppStatisticSchema,
  inactivePlayers: AppStatisticSchema,
  activePlayers: AppStatisticSchema,
  uniquePlayersToday: AppStatisticSchema,
});
export type AppStatisticsResponse = StaticDecode<typeof AppStatisticsResponseSchema>;
export type AppStatistic = StaticDecode<typeof AppStatisticSchema>;
