import { z } from "zod";

export const ScoreStatsHeadPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

export type ScoreStatsHeadPositionToken = z.infer<typeof ScoreStatsHeadPositionSchema>;
