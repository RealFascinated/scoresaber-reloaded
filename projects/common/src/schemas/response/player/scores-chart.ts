import { Type, type StaticDecode } from "typebox";
import { DateSchema } from "../../date";

export const PlayerScoreChartDataPointSchema = Type.Object({
  accuracy: Type.Number(),
  stars: Type.Number(),
  pp: Type.Number(),
  timestamp: DateSchema,
  leaderboardId: Type.Number(),
  leaderboardName: Type.String(),
  leaderboardDifficulty: Type.String(),
});
export const PlayerScoresChartResponseSchema = Type.Object({
  data: Type.Array(PlayerScoreChartDataPointSchema),
});

export type PlayerScoreChartDataPoint = StaticDecode<typeof PlayerScoreChartDataPointSchema>;
export type PlayerScoresChartResponse = StaticDecode<typeof PlayerScoresChartResponseSchema>;
