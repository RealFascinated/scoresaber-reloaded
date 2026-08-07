import { Type, type StaticDecode } from "@sinclair/typebox";
import { ScoreStatsSchema } from "../../beatleader/tokens/score-stats/score-stats";

export const ScoreStatsResponseSchema = Type.Object({
  /**
   * The current score's scorestats.
   */
  current: ScoreStatsSchema,

  /**
   * The previous score's scorestats.
   */
  previous: Type.Optional(ScoreStatsSchema),
});

export type ScoreStatsResponse = StaticDecode<typeof ScoreStatsResponseSchema>;
