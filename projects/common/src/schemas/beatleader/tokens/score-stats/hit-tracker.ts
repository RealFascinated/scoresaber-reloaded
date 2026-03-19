import { z } from "zod";

export const ScoreStatsHitTrackerSchema = z.object({
  maxCombo: z.number(),
  maxStreak: z.number(),
  leftTiming: z.number(),
  rightTiming: z.number(),
  leftMiss: z.number(),
  rightMiss: z.number(),
  leftBadCuts: z.number(),
  rightBadCuts: z.number(),
  leftBombs: z.number(),
  rightBombs: z.number(),
});

export type ScoreStatsHitTrackerToken = z.infer<typeof ScoreStatsHitTrackerSchema>;
