import { z } from "zod";
import { ScoreStatsHeadPositionSchema } from "./head-position";

export const ScoreStatsWinTrackerSchema = z.object({
  won: z.boolean(),
  endTime: z.number(),
  nbOfPause: z.number(),
  totalPauseDuration: z.number(),
  jumpDistance: z.number(),
  averageHeight: z.number(),
  averageHeadPosition: ScoreStatsHeadPositionSchema,
  totalScore: z.number(),
  maxScore: z.number(),
});

export type ScoreStatsWinTrackerToken = z.infer<typeof ScoreStatsWinTrackerSchema>;
