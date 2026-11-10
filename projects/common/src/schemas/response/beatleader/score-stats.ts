import { Type, type StaticDecode } from "typebox";
import { ScoreStatsSchema } from "../../beatleader/tokens/score-stats/score-stats";

export const ScoreStatsResponseSchema = Type.Object({
  current: ScoreStatsSchema,

  previous: Type.Optional(ScoreStatsSchema),
});

export type ScoreStatsResponse = StaticDecode<typeof ScoreStatsResponseSchema>;
