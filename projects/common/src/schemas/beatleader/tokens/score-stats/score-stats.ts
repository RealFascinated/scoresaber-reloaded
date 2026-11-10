import { Type, type StaticDecode } from "typebox";
import { ScoreStatsAccuracyTrackerSchema } from "./accuracy-tracker";
import { ScoreStatsHitTrackerSchema } from "./hit-tracker";
import { ScoreStatsGraphTrackerSchema } from "./score-graph-tracker";
import { ScoreStatsWinTrackerSchema } from "./win-tracker";

export const ScoreStatsSchema = Type.Object({
  hitTracker: ScoreStatsHitTrackerSchema,
  accuracyTracker: ScoreStatsAccuracyTrackerSchema,
  winTracker: ScoreStatsWinTrackerSchema,
  scoreGraphTracker: ScoreStatsGraphTrackerSchema,
});

export type ScoreStatsToken = StaticDecode<typeof ScoreStatsSchema>;
