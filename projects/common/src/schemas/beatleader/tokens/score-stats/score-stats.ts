import { z } from "zod";
import { ScoreStatsAccuracyTrackerSchema } from "./accuracy-tracker";
import { ScoreStatsHitTrackerSchema } from "./hit-tracker";
import { ScoreStatsGraphTrackerSchema } from "./score-graph-tracker";
import { ScoreStatsWinTrackerSchema } from "./win-tracker";

export const ScoreStatsSchema = z.object({
  hitTracker: ScoreStatsHitTrackerSchema,
  accuracyTracker: ScoreStatsAccuracyTrackerSchema,
  winTracker: ScoreStatsWinTrackerSchema,
  scoreGraphTracker: ScoreStatsGraphTrackerSchema,
});

export type ScoreStatsToken = z.infer<typeof ScoreStatsSchema>;
