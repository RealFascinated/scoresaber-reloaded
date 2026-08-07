import { Type, type StaticDecode } from "@sinclair/typebox";

export const ScoreStatsAccuracyTrackerSchema = Type.Object({
  accRight: Type.Number(),
  accLeft: Type.Number(),
  leftPreswing: Type.Number(),
  rightPreswing: Type.Number(),
  averagePreswing: Type.Number(),
  leftPostswing: Type.Number(),
  rightPostswing: Type.Number(),
  leftTimeDependence: Type.Number(),
  rightTimeDependence: Type.Number(),
  leftAverageCut: Type.Array(Type.Number()),
  rightAverageCut: Type.Array(Type.Number()),
  gridAcc: Type.Array(Type.Number()),
  fcAcc: Type.Number(),
});

export type ScoreStatsAccuracyTrackerToken = StaticDecode<typeof ScoreStatsAccuracyTrackerSchema>;
