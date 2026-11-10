import { Type, type StaticDecode } from "typebox";

export const ScoreStatsGraphTrackerSchema = Type.Object({
  graph: Type.Array(Type.Number()),
});

export type ScoreStatsGraphTrackerToken = StaticDecode<typeof ScoreStatsGraphTrackerSchema>;
