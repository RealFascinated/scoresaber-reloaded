import { z } from "zod";

export const ScoreStatsAccuracyTrackerSchema = z.object({
  accRight: z.number(),
  accLeft: z.number(),
  leftPreswing: z.number(),
  rightPreswing: z.number(),
  averagePreswing: z.number(),
  leftPostswing: z.number(),
  rightPostswing: z.number(),
  leftTimeDependence: z.number(),
  rightTimeDependence: z.number(),
  leftAverageCut: z.array(z.number()),
  rightAverageCut: z.array(z.number()),
  gridAcc: z.array(z.number()),
  fcAcc: z.number(),
});

export type ScoreStatsAccuracyTrackerToken = z.infer<typeof ScoreStatsAccuracyTrackerSchema>;
