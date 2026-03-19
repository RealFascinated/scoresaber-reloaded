import { z } from "zod";
import { ScoreStatsSchema } from "../../beatleader/tokens/score-stats/score-stats";

export const ScoreStatsResponseSchema = z.object({
  /**
   * The current score's scorestats.
   */
  current: ScoreStatsSchema,

  /**
   * The previous score's scorestats.
   */
  previous: ScoreStatsSchema.optional(),
});

export type ScoreStatsResponse = z.infer<typeof ScoreStatsResponseSchema>;
