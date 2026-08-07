import { Type, type StaticDecode } from "@sinclair/typebox";

export const ScoreStatsHitTrackerSchema = Type.Object({
  maxCombo: Type.Number(),
  maxStreak: Type.Union([Type.Number(), Type.Null()]),
  leftTiming: Type.Number(),
  rightTiming: Type.Number(),
  leftMiss: Type.Number(),
  rightMiss: Type.Number(),
  leftBadCuts: Type.Number(),
  rightBadCuts: Type.Number(),
  leftBombs: Type.Number(),
  rightBombs: Type.Number(),
});

export type ScoreStatsHitTrackerToken = StaticDecode<typeof ScoreStatsHitTrackerSchema>;
