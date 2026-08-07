import { z } from "zod";

const AppStatisticSchema = z.object({
  value: z.number(),
  velocity: z.number(),
});

const AppStatisticsResponseSchema = z.object({
  leaderboardCount: AppStatisticSchema,
  trackedScores: AppStatisticSchema,
  scoreHistoryScores: AppStatisticSchema,
  storedReplays: AppStatisticSchema,
  inactivePlayers: AppStatisticSchema,
  activePlayers: AppStatisticSchema,
  uniquePlayersToday: AppStatisticSchema,
});
export type AppStatisticsResponse = z.infer<typeof AppStatisticsResponseSchema>;
export type AppStatistic = z.infer<typeof AppStatisticSchema>;
