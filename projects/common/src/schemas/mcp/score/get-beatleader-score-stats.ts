import { z } from "zod";
import { ScoreStatsHitTrackerSchema } from "../../beatleader/tokens/score-stats/hit-tracker";

const McpAccuracyTrackerSchema = z.object({
  accLeft: z.number(),
  accRight: z.number(),
  fcAcc: z.number(),
  averagePreswing: z.number(),
});

const McpWinTrackerSchema = z.object({
  won: z.boolean(),
  endTime: z.number(),
  nbOfPause: z.number(),
  totalPauseDuration: z.number(),
  jumpDistance: z.number(),
  averageHeight: z.number(),
  totalScore: z.number(),
  maxScore: z.number(),
});

const McpBeatLeaderAttemptStatsSchema = z.object({
  hitTracker: ScoreStatsHitTrackerSchema,
  accuracyTracker: McpAccuracyTrackerSchema,
  winTracker: McpWinTrackerSchema,
});

export const McpBeatLeaderScoreStatsSchema = z.object({
  current: McpBeatLeaderAttemptStatsSchema,
  previous: McpBeatLeaderAttemptStatsSchema.optional(),
});

export type McpBeatLeaderScoreStats = z.infer<typeof McpBeatLeaderScoreStatsSchema>;
