import { z } from "zod";

const PlayerScoreChartDataPointSchema = z.object({
  accuracy: z.number(),
  stars: z.number(),
  pp: z.number(),
  timestamp: z.date(),
  leaderboardId: z.number(),
  leaderboardName: z.string(),
  leaderboardDifficulty: z.string(),
});
const PlayerScoresChartResponseSchema = z.object({
  data: z.array(PlayerScoreChartDataPointSchema),
});

export type PlayerScoreChartDataPoint = z.infer<typeof PlayerScoreChartDataPointSchema>;
export type PlayerScoresChartResponse = z.infer<typeof PlayerScoresChartResponseSchema>;
