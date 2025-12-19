import { z } from "zod";

const AppStatisticsResponseSchema = z.object({
  leaderboardCount: z.number(),
  trackedScores: z.number(),
  scoreHistoryScores: z.number(),
  storedReplays: z.number(),
  inactivePlayers: z.number(),
  activePlayers: z.number(),
});
export type AppStatisticsResponse = z.infer<typeof AppStatisticsResponseSchema>;
