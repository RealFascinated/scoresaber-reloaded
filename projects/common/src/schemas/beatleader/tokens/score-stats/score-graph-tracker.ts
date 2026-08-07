import { Type, type StaticDecode } from "@sinclair/typebox";

export const ScoreStatsGraphTrackerSchema = Type.Object({
  graph: Type.Array(Type.Number()),
});

export type ScoreStatsGraphTrackerToken = StaticDecode<typeof ScoreStatsGraphTrackerSchema>;
