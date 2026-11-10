import { Type, type StaticDecode } from "typebox";

export const ScoreStatsHeadPositionSchema = Type.Object({
  x: Type.Number(),
  y: Type.Number(),
  z: Type.Number(),
});

export type ScoreStatsHeadPositionToken = StaticDecode<typeof ScoreStatsHeadPositionSchema>;
